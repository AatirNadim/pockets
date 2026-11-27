# Cloudflare

## Render keep-alive Worker

The `keepalive` Worker calls the Render health endpoint every 12 minutes (`*/12 * * * *`, UTC). It bypasses caches, allows 75 seconds per request for a cold start, and retries failed HTTP responses, timeouts, and network errors three times after 5, 10, and 15 seconds (up to four requests total). Each invocation logs its result; a final failure is recorded as a failed cron invocation. Configure the endpoint in `keepalive/wrangler.jsonc`.

### Deploy

1. Enable Workers on the target Cloudflare account. Create an API token using Cloudflare's **Edit Cloudflare Workers** template, scoped to that account. The token must be able to create Workers for the first deployment and edit this Worker thereafter.
2. Add the GitHub Actions repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` with the token and target account ID, respectively.
3. Merge the changes to `main`. Changes to `cloudflare/keepalive/` or the deploy workflow deploy automatically. You can also run **Deploy Cloudflare Keep-Alive** manually from the Actions tab.
4. In the Cloudflare dashboard, check the `pockets-render-keepalive` Worker's cron trigger and invocation logs. Cron changes can take up to 15 minutes to propagate. The existing **Render Keep-Alive Ping** GitHub workflow remains available for manual troubleshooting.

The Worker does not expose an HTTP route. It is a best-effort keep-alive, not an availability guarantee or an independent alert. Render's free services can restart or be suspended when workspace usage limits are reached.

The timeout covers the request through receipt of response headers; Workers fetch does not expose a separate connection timeout. The Worker checks HTTP status and does not inspect the response body. It logs the scheduled and actual start times, attempt durations, and failures, but does not send alerts or coordinate overlapping invocations. Use an independent monitor if missed schedules or backend outages need alerting. Run the checks locally with `node --test cloudflare/keepalive/test/*.test.mjs`.
