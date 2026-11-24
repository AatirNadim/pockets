#!/usr/bin/env bash
# ==============================================================================
# Helper to install, inspect, or remove the Render Keep-Alive Crontab Entry
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEEPALIVE_SCRIPT="$SCRIPT_DIR/render-keepalive.sh"
LOG_DIR="$(dirname "$SCRIPT_DIR")/logs"
LOG_FILE="$LOG_DIR/keepalive.log"

CRON_SCHEDULE="*/12 * * * *"
CRON_TAG="# POCKETS_RENDER_KEEPALIVE_CRON"
CRON_COMMAND="$CRON_SCHEDULE $KEEPALIVE_SCRIPT >> $LOG_FILE 2>&1 $CRON_TAG"

usage() {
  echo "Usage: $0 [install|remove|status|run-now]"
  echo ""
  echo "Commands:"
  echo "  install   - Add the 12-minute keep-alive cron job to current user's crontab"
  echo "  remove    - Remove the keep-alive cron job from current user's crontab"
  echo "  status    - Check if the keep-alive cron job is currently installed"
  echo "  run-now   - Run the keep-alive script once immediately"
  exit 1
}

check_crontab_access() {
  if ! command -v crontab >/dev/null 2>&1; then
    echo "❌ Error: 'crontab' command not found on this system." >&2
    echo "💡 Alternative: Use the systemd timer in scripts/systemd/ or GitHub Actions." >&2
    return 1
  fi
  return 0
}

install_cron() {
  check_crontab_access
  mkdir -p "$LOG_DIR"
  chmod +x "$KEEPALIVE_SCRIPT"

  # Read existing crontab or empty if none
  local current_cron=""
  if crontab -l 2>/dev/null; then
    current_cron="$(crontab -l 2>/dev/null | grep -v "$CRON_TAG" || true)"
  fi

  # Append new cron job
  if [[ -n "$current_cron" ]]; then
    printf "%s\n%s\n" "$current_cron" "$CRON_COMMAND" | crontab -
  else
    printf "%s\n" "$CRON_COMMAND" | crontab -
  fi

  echo "✅ Crontab entry installed successfully!"
  echo "Schedule: Every 12 minutes (*/12 * * * *)"
  echo "Command:  $CRON_COMMAND"
  echo "Logs:     $LOG_FILE"
}

remove_cron() {
  check_crontab_access
  if crontab -l 2>/dev/null | grep -q "$CRON_TAG"; then
    crontab -l 2>/dev/null | grep -v "$CRON_TAG" | crontab -
    echo "✅ Removed keep-alive cron entry from crontab."
  else
    echo "ℹ️  No keep-alive cron entry found in crontab."
  fi
}

status_cron() {
  check_crontab_access
  echo "🔍 Inspecting user crontab for keep-alive entry:"
  if crontab -l 2>/dev/null | grep -q "$CRON_TAG"; then
    echo "✅ Active keep-alive cron found:"
    crontab -l 2>/dev/null | grep "$CRON_TAG"
  else
    echo "❌ No active keep-alive entry found."
  fi
}

case "${1:-}" in
  install)
    install_cron
    ;;
  remove)
    remove_cron
    ;;
  status)
    status_cron
    ;;
  run-now)
    "$KEEPALIVE_SCRIPT"
    ;;
  *)
    usage
    ;;
esac
