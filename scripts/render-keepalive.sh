#!/usr/bin/env bash
# ==============================================================================
# Render Keep-Alive Health Ping Script
# Target: https://pockets-kyb4.onrender.com/health
# Interval: Every 12 minutes (Render cold sleep threshold: 15 minutes)
# Max Retries: 3 (with incremental backoff)
# ==============================================================================

set -uo pipefail

# ------------------------------------------------------------------------------
# Configuration & Defaults
# ------------------------------------------------------------------------------
HEALTH_URL="${HEALTH_URL:-https://pockets-kyb4.onrender.com/health}"
MAX_RETRIES="${MAX_RETRIES:-3}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-20}" # Connect timeout in seconds (DNS + TCP/TLS)
MAX_TIME="${MAX_TIME:-75}"              # Total timeout in seconds (Cold starts take 30-60s)
BACKOFF_BASE="${BACKOFF_BASE:-5}"        # Delay = attempt * BACKOFF_BASE (5s, 10s, 15s)
LOG_FILE="${LOG_FILE:-}"                 # Optional file path, e.g. ./logs/keepalive.log
LOCK_FILE="${LOCK_FILE:-/tmp/pockets-keepalive.lock}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"       # Optional webhook URL for failure alerts
MAX_LOG_LINES="${MAX_LOG_LINES:-5000}"   # Auto-trim log file to prevent disk exhaustion

# ------------------------------------------------------------------------------
# Logging Helper
# ------------------------------------------------------------------------------
log() {
  local level="$1"
  shift
  local timestamp
  timestamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  local message="[$timestamp] [$level] $*"

  # Print to stderr/stdout
  echo "$message"

  # Print to log file if configured
  if [[ -n "$LOG_FILE" ]]; then
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
    echo "$message" >> "$LOG_FILE"
  fi
}

trim_logs() {
  if [[ -n "$LOG_FILE" && -f "$LOG_FILE" ]]; then
    local count
    count="$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)"
    if [[ "$count" -gt "$MAX_LOG_LINES" ]]; then
      local tmp
      tmp="$(mktemp)"
      tail -n "$(( MAX_LOG_LINES / 2 ))" "$LOG_FILE" > "$tmp" 2>/dev/null && mv "$tmp" "$LOG_FILE"
      log "INFO" "Rotated log file; trimmed from $count lines to $(( MAX_LOG_LINES / 2 )) lines"
    fi
  fi
}

# ------------------------------------------------------------------------------
# Concurrency / Overlap Lock (Prevents overlapping cron runs)
# ------------------------------------------------------------------------------
acquire_lock() {
  if command -v flock >/dev/null 2>&1; then
    exec 200>"$LOCK_FILE"
    if ! flock -n 200; then
      log "WARN" "Another keep-alive instance is already running (locked via flock). Exiting to prevent overlap."
      exit 0
    fi
  else
    # Fallback to atomic dir lock if flock is unavailable
    local lock_dir="${LOCK_FILE}.d"
    if ! mkdir "$lock_dir" 2>/dev/null; then
      # Check if PID is still alive
      if [[ -f "$lock_dir/pid" ]]; then
        local old_pid
        old_pid="$(cat "$lock_dir/pid" 2>/dev/null || echo "")"
        if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null; then
          log "WARN" "Another keep-alive instance (PID $old_pid) is already running. Exiting."
          exit 0
        fi
      fi
      # Stale lock cleanup
      rm -rf "$lock_dir" 2>/dev/null || true
      mkdir "$lock_dir" 2>/dev/null || exit 0
    fi
    echo $$ > "$lock_dir/pid"
    trap 'rm -rf "${LOCK_FILE}.d"' EXIT
  fi
}

# ------------------------------------------------------------------------------
# Alert Webhook Helper (Optional: Slack/Discord/ntfy/generic webhook)
# ------------------------------------------------------------------------------
send_alert() {
  local error_details="$1"
  if [[ -n "$ALERT_WEBHOOK" ]]; then
    log "WARN" "Dispatching failure notification to configured alert webhook..."
    local payload
    payload="$(printf '{"text":"[Pockets Render KeepAlive Alert] Health check failed for %s. Details: %s"}' "$HEALTH_URL" "$error_details")"
    curl -s -X POST -H "Content-Type: application/json" -d "$payload" --max-time 10 "$ALERT_WEBHOOK" >/dev/null 2>&1 || true
  fi
}

# ------------------------------------------------------------------------------
# Single Ping Execution
# ------------------------------------------------------------------------------
perform_ping() {
  local attempt="$1"
  local resp_file meta_file
  resp_file="$(mktemp)"
  meta_file="$(mktemp)"

  local curl_exit=0
  curl -sSL \
    --connect-timeout "$CONNECT_TIMEOUT" \
    --max-time "$MAX_TIME" \
    -A "PocketsKeepAlive/1.0 (+https://pockets-kyb4.onrender.com/health)" \
    -o "$resp_file" \
    -w "http_code=%{http_code}\ntime_total=%{time_total}\ntime_connect=%{time_connect}\n" \
    "$HEALTH_URL" > "$meta_file" 2>&1 || curl_exit=$?

  local http_code="000"
  local time_total="0.000"
  local time_connect="0.000"

  if [[ -f "$meta_file" ]]; then
    while IFS='=' read -r key val; do
      case "$key" in
        http_code) http_code="$val" ;;
        time_total) time_total="$val" ;;
        time_connect) time_connect="$val" ;;
      esac
    done < "$meta_file"
  fi

  local response_body
  response_body="$(head -c 256 "$resp_file" 2>/dev/null || echo "")"
  rm -f "$resp_file" "$meta_file"

  # Evaluate results
  if [[ "$curl_exit" -eq 0 && "$http_code" =~ ^2[0-9]{2}$ ]]; then
    # Optional check: verify body has 'status' or 'ok'
    if [[ "$response_body" =~ status|ok ]]; then
      log "SUCCESS" "[Attempt $attempt] Health OK! Status: $http_code | Total: ${time_total}s | Connect: ${time_connect}s"
    else
      log "SUCCESS" "[Attempt $attempt] HTTP Status: $http_code | Total: ${time_total}s (Body: $response_body)"
    fi
    return 0
  fi

  # Error classifications
  local err_reason="HTTP Status $http_code"
  case "$curl_exit" in
    6)  err_reason="DNS Resolution Failed (curl exit 6)" ;;
    7)  err_reason="Failed to connect to host/port (curl exit 7)" ;;
    28) err_reason="Operation timed out (curl exit 28 - server slow/waking up)" ;;
    35) err_reason="SSL handshake error (curl exit 35)" ;;
    52) err_reason="Empty reply from server (curl exit 52)" ;;
    *)  [[ "$curl_exit" -ne 0 ]] && err_reason="cURL failed with exit code $curl_exit" ;;
  esac

  if [[ "$http_code" =~ ^50[234]$ ]]; then
    err_reason="Render gateway error HTTP $http_code (server starting or temporarily unavailable)"
  elif [[ "$http_code" == "404" ]]; then
    err_reason="Endpoint not found HTTP 404 (check route URL)"
  fi

  log "WARN" "[Attempt $attempt] Ping failed. Reason: $err_reason | Latency: ${time_total}s | Response: ${response_body:0:100}"
  return 1
}

# ------------------------------------------------------------------------------
# Main Execution Loop
# ------------------------------------------------------------------------------
main() {
  acquire_lock

  log "INFO" "Starting keep-alive check for $HEALTH_URL (Max retries: $MAX_RETRIES)"

  local attempt=0
  local success=false

  while [[ "$attempt" -le "$MAX_RETRIES" ]]; do
    if [[ "$attempt" -gt 0 ]]; then
      local delay=$(( attempt * BACKOFF_BASE ))
      log "INFO" "Waiting ${delay}s before retry attempt $attempt of $MAX_RETRIES..."
      sleep "$delay"
    fi

    if perform_ping "$attempt"; then
      success=true
      break
    fi

    attempt=$(( attempt + 1 ))
  done

  trim_logs

  if [[ "$success" == "true" ]]; then
    exit 0
  else
    log "ERROR" "CRITICAL: All $MAX_RETRIES retries failed for $HEALTH_URL. Render server may be down or unreachable."
    send_alert "All $MAX_RETRIES retries failed for $HEALTH_URL"
    exit 1
  fi
}

main "$@"
