#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const costPath = path.join(projectRoot, '.hookforge', 'telemetry', 'session-costs.jsonl');

function readEntries() {
  try {
    return fs.readFileSync(costPath, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatCost(n) {
  if (n == null) return '--';
  return '$' + n.toFixed(4);
}

function formatDuration(ms) {
  if (ms == null) return '--';
  if (ms < 60000) return Math.round(ms / 1000) + 's';
  return Math.round(ms / 60000) + 'm';
}

function summarize(entries) {
  const total = entries.reduce((s, e) => s + (e.estimated_cost || 0), 0);
  return { count: entries.length, total };
}

const flag = process.argv[2] || '--today';
const entries = readEntries();

if (!entries.length) {
  console.log('No session cost data yet. (session-costs.jsonl is empty or missing)');
  console.log('Cost tracking activates on next session end.');
  process.exit(0);
}

if (flag === '--today') {
  const today = isoToday();
  const todayEntries = entries.filter(e => (e.ts || '').startsWith(today));
  const { count, total } = summarize(todayEntries);
  console.log(`Today (${today}): ${formatCost(total)} across ${count} session(s)`);
  todayEntries.forEach(e => {
    const dur = formatDuration(e.duration_ms);
    const cost = formatCost(e.estimated_cost);
    console.log(`  ${e.session_id.slice(0, 8)} | ${e.ts.slice(11, 19)} | ${dur} | ${cost} (est, last call only)`);
  });
} else if (flag === '--all') {
  const { count, total } = summarize(entries);
  console.log(`All time: ${formatCost(total)} across ${count} session(s)`);

  const byDate = {};
  entries.forEach(e => {
    const d = (e.ts || '').slice(0, 10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(e);
  });
  Object.keys(byDate).sort().reverse().slice(0, 14).forEach(d => {
    const { count, total } = summarize(byDate[d]);
    console.log(`  ${d}: ${formatCost(total)} (${count} sessions)`);
  });
} else {
  console.error('Usage: node scripts/session-tokens.js [--today | --all]');
  process.exit(1);
}
