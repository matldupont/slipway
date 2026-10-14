// Which gate commands a path filter can keep from running (L-56, FO1's path-filter rule). A workflow file is read the
// way W1 reads it (lib/workflows.mjs: the same trigger and `run:` readers), and a `paths` or `paths-ignore` filter on
// `pull_request` or `push` is read here and nowhere else.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommand } from './commands.mjs';
import { GATED } from './tasks.mjs';
import { readWorkflow } from './workflow-yaml.mjs';
import { runLines, triggerOf } from './workflows.mjs';

// A command line that runs a gate: a package script `verify` takes or `meta` holds (`pnpm verify`, `pnpm meta`, a
// gated script, `turbo run` of gated tasks), `node ci/verify.mjs`, or one of the checks in ci/checks/meta. A
// script a root script calls is not followed: `pnpm meta` is one gate here, not the checks inside it.
//
// A gate is named by what it runs and where. Each command of a line is judged on its own (split at `&&`, `||`, `;` and
// `|` outside quotes; what follows `||` up to the next `;` or `&&` runs only when the left side failed, and is not
// read, as in commands.mjs). The plain form (`pnpm <script>`, `pnpm run <script>`, `turbo run <task>`, `node <path>`,
// alone) is named by that form, so two workflows running `pnpm verify` run the same gate. Any other form (`-C` or
// `--dir`, `--filter`, `-r`, an argument such as `--plan`, an environment assignment or a redirect before or after
// it) is named by its own command text, so it covers only a command written the same: a narrower run never stands
// in for a broader one. The working directory (`defaults.run`, a step's `working-directory`) and a `cd` or `pushd`
// earlier in the same step are part of the name too. Not read: a subshell or group around a command (`(cd x && pnpm
// test)`), a shell condition (`false && pnpm verify`), a job's or step's `if:`, and which branches a workflow runs on.
const GATE_SCRIPT = /^(?:verify|verify:fast|meta)$/;
function commandsOf(cmd) {
  const out = [];
  let cur = '';
  let quote = null;
  let skipping = false;
  const end = (sep) => {
    const text = cur.trim().split(/\s+/).join(' ');
    if (text && !skipping) out.push(text);
    cur = '';
    if (sep === '||') skipping = true;
    else if (sep === ';' || sep === '&&') skipping = false;
  };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) { cur += c; if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    const two = cmd.slice(i, i + 2);
    if (two === '&&' || two === '||') { end(two); i++; continue; }
    if (c === ';' || c === '|') { end(c); continue; }
    cur += c;
  }
  end('');
  return out;
}
function gatesOf(cmd, dir, state) {
  const out = [];
  for (const text of commandsOf(cmd)) {
    const first = text.split(' ')[0];
    if (first === 'cd' || first === 'pushd') {
      state.cd = text.slice(first.length).trim() || '?';
      continue;
    }
    const where = [dir, state.cd && `cd ${state.cd}`].filter(Boolean).join(', ');
    const at = where ? ` [in ${where}]` : '';
    const named = (name, plain) => (plain.includes(text) ? name : text) + at;
    for (const c of parseCommand(text)) {
      if (c.kind === 'pnpm-script' && (GATE_SCRIPT.test(c.script) || GATED.test(c.script))) out.push(named(`pnpm ${c.script}`, [`pnpm ${c.script}`, `pnpm run ${c.script}`, `pnpm run-script ${c.script}`]));
      else if (c.kind === 'turbo') for (const t of c.tasks.filter((t) => GATED.test(t))) out.push(named(`turbo run ${t}`, [`turbo run ${t}`]));
      else if (c.kind === 'node' && (c.path === 'ci/verify.mjs' || /^ci\/checks\/meta\/[\w.-]+\.mjs$/.test(c.path))) out.push(named(`node ${c.path}`, [`node ${c.path}`, `node ./${c.path}`]));
    }
  }
  return out;
}

// The workflows whose path filter keeps a gate from running on some change (L-56). For each gate command and each
// event (`pull_request`, `push`): when every workflow that runs it on that event carries a `paths` or `paths-ignore`
// filter for it, a change that touches no matching path runs no copy of the gate, and each of those workflows is a
// site: `{ id: '<workflow path>#on.<event>', workflow, event, filter, commands, with }`, `with` the other filtered workflows that run the same gate. A gate that some workflow also runs on
// that event without a filter is covered, whatever a deploy workflow does (#239). Not followed: a gate a reusable
// workflow runs for a caller (its caller's filter is the one that applies), and what a root script calls. `unread`
// holds the workflows whose trigger could not be read, with a fixed reason: a filter in one could not be seen.
export function filteredGates(root) {
  const out = { sites: [], unread: [], files: 0 };
  const dir = join(root, '.github', 'workflows');
  if (!existsSync(dir)) return out;
  const runners = new Map(); // `${event}\u0000${command}` → [{ rel, filtered }]
  for (const f of readdirSync(dir).filter((e) => /\.ya?ml$/.test(e)).sort()) {
    const w = readWorkflow(readFileSync(join(dir, f), 'utf8'));
    const rel = `.github/workflows/${f}`;
    out.files++;
    const trigger = triggerOf(w);
    if (trigger.unread) {
      out.unread.push({ file: rel, reason: trigger.unread });
      continue;
    }
    const states = new Map(); // a step's lines share its `cd`
    const gates = new Set(runLines(rel, w.root).flatMap((l) => gatesOf(l.cmd, l.dir, states.get(l.step) ?? states.set(l.step, { cd: '' }).get(l.step))));
    for (const [event, e] of Object.entries(trigger.events)) {
      if (!e.on) continue;
      for (const g of gates) {
        const key = `${event}\u0000${g}`;
        runners.set(key, [...(runners.get(key) ?? []), { rel, filtered: e.filtered.length > 0, keys: e.filtered }]);
      }
    }
  }
  const sites = new Map();
  for (const [key, list] of runners) {
    if (!list.every((r) => r.filtered)) continue;
    const [event, command] = key.split('\u0000');
    for (const r of list) {
      const id = `${r.rel}#on.${event}`;
      const site = sites.get(id) ?? { id, workflow: r.rel, event, filter: r.keys.join(' and '), commands: [], with: [] };
      site.commands.push(command);
      for (const o of list) if (o.rel !== r.rel && !site.with.includes(o.rel)) site.with.push(o.rel);
      sites.set(id, site);
    }
  }
  out.sites = [...sites.values()];
  return out;
}
