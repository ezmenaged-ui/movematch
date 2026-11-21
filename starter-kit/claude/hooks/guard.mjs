#!/usr/bin/env node
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// PreToolUse guard: blocks actions that must stay with the owner, even in Auto mode.
// Exit code 2 = block; the message on stderr goes back to the agent so it can queue the task in docs/QUESTIONS.md.
// A seat belt, not a security boundary: also protect `main` on GitHub.
let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(raw || '{}'); } catch { process.exit(0); }
  const tool = input.tool_name || '';
  const ti = input.tool_input || {};
  const block = (why) => {
    process.stderr.write(`Blocked by .claude/hooks/guard.mjs: ${why}. This is an owner-only (red) action: prepare it to the last step and add it to docs/QUESTIONS.md instead.\n`);
    process.exit(2);
  };

  // Autonomy level from .claude/autonomy.json: "prelaunch" (yellow items allowed) or "live" (green only).
  let level = 'live';
  try {
    const fs = require('node:fs');
    const dir = process.env.CLAUDE_PROJECT_DIR || input.cwd || '.';
    level = JSON.parse(fs.readFileSync(`${dir}/.claude/autonomy.json`, 'utf8')).level || 'live';
  } catch {}
  if (level !== 'prelaunch' && /^mcp__.*github.*__merge_pull_request$/i.test(tool)) block('merging a PR (main = production) while the site is live');

  if (tool === 'Bash') {
    const cmd = String(ti.command || '');
    const c = cmd.replace(/\s+/g, ' ');
    if (/\bgit\b[^;&|]*\bpush\b/.test(c)) {
      if (/(\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S)/.test(c)) block('force push');
      if (/\bpush\b[^;&|]*(\s|:)(main|master)(\s|$|;|&|\|)/.test(c)) block('push to main/master (main = production)');
      if (/\bpush\b[^;&|]*\sHEAD:(refs\/heads\/)?(main|master)\b/.test(c)) block('push to main/master (main = production)');
    }
    if (/\bvercel\b[^;&|]*(\s--prod\b|\s--production\b|\spromote\b)/.test(c)) block('production deploy from the CLI');
    if (/api\.twilio\.com[^\s'"]*\/Messages(\.json)?/i.test(c) && /(\s-d\s|\s--data|\s-X\s*POST|\s--request\s*POST|\s-F\s|\s--form)/i.test(c)) block('sending a real WhatsApp/SMS through the Twilio Messages API');
    if (/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b/.test(c)) block('piping a download into a shell');
    if (/\brm\s+-[a-z]*r[a-z]*f?[a-z]*\s+(\/|~|\$HOME)(\s|$)/.test(c)) block('recursive delete of / or home');
    if (/\bsupabase\b[^;&|]*\bdb\s+reset\b[^;&|]*--linked/.test(c)) block('reset of the linked (production) database');
  }

  if (/^mcp__.*supabase.*__execute_sql$/i.test(tool) || /^mcp__.*supabase.*__apply_migration$/i.test(tool)) {
    const q = String(ti.query || ti.sql || '').replace(/--.*$/gm, '');
    if (/\b(drop\s+(table|schema|database)|truncate)\b/i.test(q)) block('DROP/TRUNCATE on the database');
    if (/\bdelete\s+from\b(?![\s\S]*\bwhere\b)/i.test(q)) block('DELETE without WHERE');
    if (/\bdelete\s+from\s+[\w."]*(lead|provider|mover|offer|bid|tender)/i.test(q)) block('deleting leads, providers or offers (cleanup deletes need the owner\'s OK)');
  }
  if (/^mcp__.*supabase.*__(create_project|pause_project|delete_branch|reset_branch|merge_branch)$/i.test(tool)) block(`${tool.split('__').pop()} (costs money or touches production)`);

  process.exit(0);
});
