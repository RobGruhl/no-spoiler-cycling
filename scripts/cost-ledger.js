#!/usr/bin/env node

/**
 * Cost ledger reporter.
 *
 * Reads the JSONL ledger written by lib/cost-ledger.js (one line per Perplexity /
 * Firecrawl API call) and turns the call counts into a dollar estimate for the
 * daily stage-backfill routine's Slack report.
 *
 *   node scripts/cost-ledger.js report \
 *     [--ledger PATH]        # defaults to $NSC_COST_LEDGER
 *     [--stages N]           # stages backfilled this run (for the summary line)
 *     [--stage-ids a,b,c]    # the stage ids backfilled (shown in the report)
 *     [--model MODEL]        # Claude model the routine ran on (default claude-sonnet-4-6)
 *     [--claude-in N]        # actual Claude input tokens, if known (else heuristic)
 *     [--claude-out N]       # actual Claude output tokens, if known (else heuristic)
 *     [--date YYYY-MM-DD]    # report date (default today UTC)
 *     [--json]               # machine-readable instead of Slack mrkdwn
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RATES ARE PUBLISHED LIST-PRICE ESTIMATES, not billed amounts. The Perplexity
 * and Firecrawl figures are derived from exact call counts × per-call list price,
 * so they're close. The Claude figure is the rough one: unless --claude-in/out
 * are supplied it is a per-stage heuristic, and a scheduled cloud agent can't
 * self-meter its own tokens — treat console.anthropic.com/settings/usage as the
 * source of truth for Claude spend. Override any rate via the env vars below.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';

const args = process.argv.slice(2);
const cmd = args[0];

function flag(name, fallback = undefined) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
}
const has = name => args.includes(`--${name}`);
const num = (v, d) => (v == null || v === '' || isNaN(Number(v)) ? d : Number(v));

// ---- Rates (list-price estimates; override via env) ----
const RATES = {
  // Perplexity Search API: ~$5 / 1000 requests.
  perplexityPerQuery: num(process.env.NSC_RATE_PERPLEXITY, 0.005),
  // Firecrawl scrape ≈ 1 credit; ~$0.001/credit on the standard tier.
  firecrawlPerScrape: num(process.env.NSC_RATE_FIRECRAWL, 0.001),
};
// Claude per-million-token rates by model (input, output).
// Per-MTok list prices (input, output), verified against the Claude model catalog.
const CLAUDE_RATES = {
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-opus-4-8': { in: 5, out: 25 },
  'claude-haiku-4-5': { in: 1, out: 5 },
};
// Heuristic token use per stage when actuals aren't supplied (context re-reads,
// research tool results, JSON writing). Deliberately generous so the estimate
// errs high rather than low. Override via env.
const HEURISTIC_IN_PER_STAGE = num(process.env.NSC_CLAUDE_IN_PER_STAGE, 120_000);
const HEURISTIC_OUT_PER_STAGE = num(process.env.NSC_CLAUDE_OUT_PER_STAGE, 15_000);
const HEURISTIC_BASE_IN = num(process.env.NSC_CLAUDE_BASE_IN, 40_000); // discovery + build + tests even at 0 stages

function readLedger(path) {
  if (!path) return [];
  let raw;
  try { raw = fs.readFileSync(path, 'utf8'); } catch { return []; }
  const rows = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { rows.push(JSON.parse(t)); } catch { /* skip malformed line */ }
  }
  return rows;
}

function usd(n) {
  if (n < 0.01) return `$${n.toFixed(4)}`;
  if (n < 1) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(2)}`;
}

function report() {
  const ledgerPath = flag('ledger', process.env.NSC_COST_LEDGER);
  const stages = num(flag('stages'), 0);
  const stageIds = (flag('stage-ids') || '').split(',').map(s => s.trim()).filter(Boolean);
  const model = flag('model', 'claude-sonnet-4-6');
  const date = flag('date', new Date().toISOString().slice(0, 10));

  const rows = readLedger(ledgerPath);
  // Count only billable calls — providers generally don't charge for failed
  // requests (429/5xx), and a retried call records both the failure and the
  // success row, which would double-count. A row with no status predates the
  // status field, so treat it as billable.
  const billable = r => r.status === undefined || r.status < 400;
  const perplexity = rows.filter(r => r.provider === 'perplexity' && billable(r)).length;
  const firecrawl = rows.filter(r => r.provider === 'firecrawl' && billable(r)).length;

  const perplexityCost = perplexity * RATES.perplexityPerQuery;
  const firecrawlCost = firecrawl * RATES.firecrawlPerScrape;

  // Claude: use actuals if supplied, else heuristic from stage count.
  const claudeActual = has('claude-in') || has('claude-out');
  const claudeIn = claudeActual ? num(flag('claude-in'), 0) : HEURISTIC_BASE_IN + stages * HEURISTIC_IN_PER_STAGE;
  const claudeOut = claudeActual ? num(flag('claude-out'), 0) : stages * HEURISTIC_OUT_PER_STAGE;
  const rate = CLAUDE_RATES[model] || CLAUDE_RATES['claude-sonnet-4-6'];
  const claudeCost = (claudeIn / 1e6) * rate.in + (claudeOut / 1e6) * rate.out;
  const claudeLabel = claudeActual ? 'metered' : 'approx';

  const apiTotal = perplexityCost + firecrawlCost;
  const total = apiTotal + claudeCost;

  const result = {
    date,
    stages,
    stageIds,
    model,
    calls: { perplexity, firecrawl },
    costs: {
      perplexity: perplexityCost,
      firecrawl: firecrawlCost,
      claude: claudeCost,
      apiTotal,
      total,
    },
    claude: { tokensIn: claudeIn, tokensOut: claudeOut, source: claudeLabel },
    rates: { ...RATES, claude: rate },
  };

  if (has('json')) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Slack mrkdwn block.
  const stageList = stages === 0
    ? '_none — nothing past-due to backfill_'
    : `${stages}${stageIds.length ? ` (${stageIds.join(', ')})` : ''}`;
  const lines = [
    `📊 *No-spoiler-cycling — daily stage backfill* · ${date}`,
    `• *Stages backfilled:* ${stageList}`,
    `• *Perplexity:* ${perplexity} quer${perplexity === 1 ? 'y' : 'ies'} × ~${usd(RATES.perplexityPerQuery)} = ~${usd(perplexityCost)}`,
    `• *Firecrawl:* ${firecrawl} scrape${firecrawl === 1 ? '' : 's'} × ~${usd(RATES.firecrawlPerScrape)} = ~${usd(firecrawlCost)}`,
    `• *Claude (${model}, ${claudeLabel}):* ~${(claudeIn / 1000).toFixed(0)}k in / ~${(claudeOut / 1000).toFixed(0)}k out = ~${usd(claudeCost)}`,
    `• *Estimated total:* ~${usd(total)}  _(API costs from exact call counts; Claude ${claudeLabel} — authoritative spend at console.anthropic.com/settings/usage)_`,
  ];
  console.log(lines.join('\n'));
}

if (cmd === 'report') {
  report();
} else {
  console.error('usage: node scripts/cost-ledger.js report [--ledger PATH] [--stages N] [--stage-ids a,b] [--model M] [--claude-in N] [--claude-out N] [--date YYYY-MM-DD] [--json]');
  process.exit(2);
}
