#!/usr/bin/env node

/**
 * Cost ledger — opt-in, zero-overhead API-call accounting.
 *
 * When the env var NSC_COST_LEDGER points at a file path, every Perplexity /
 * Firecrawl request made through this project's in-repo wrappers appends one
 * JSON line (provider, endpoint, ISO timestamp) to that file. When the var is
 * unset, recordApiCall() is a no-op — normal runs pay nothing.
 *
 * scripts/cost-ledger.js reads the file back and turns the call counts into a
 * dollar estimate for the daily backfill routine's Slack report.
 *
 * Design rules:
 *   - NEVER throw. A ledger write must not be able to break a research call.
 *   - Synchronous append so a process that exits right after the API call still
 *     records it (no unflushed async write).
 */

import fs from 'fs';

/**
 * Record one billable API call. No-op unless NSC_COST_LEDGER is set.
 * @param {'perplexity'|'firecrawl'} provider
 * @param {string} endpoint - e.g. '/search', '/scrape', '/chat/completions'
 * @param {object} [meta] - optional extra fields (e.g. { status: 200 })
 */
export function recordApiCall(provider, endpoint, meta = {}) {
  const ledger = process.env.NSC_COST_LEDGER;
  if (!ledger) return;
  try {
    const line = JSON.stringify({
      provider,
      endpoint,
      at: new Date().toISOString(),
      ...meta,
    }) + '\n';
    fs.appendFileSync(ledger, line);
  } catch {
    /* ledger is best-effort telemetry — never let it surface */
  }
}
