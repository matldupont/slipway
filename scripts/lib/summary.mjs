// The default (summary) output of `sync` and `sync --adopt` (#59): one count line per bucket with what it
// means and what sync does with it, then only the rows that need the owner, each with its next command.
// `--verbose` prints the per-path list instead. Shared so the two plans describe the base the same way.

export const BASE_WHY =
  'The base is the slipway commit these files last matched. Sync needs it to tell "you changed this" from "slipway changed this", the way a merge needs a common ancestor.';

// One line per bucket: `<n> <label>`, then its meaning, aligned.
export function bucketLines(buckets) {
  const head = buckets.map((b) => `${b.n} ${b.label}`);
  const width = Math.max(...head.map((h) => h.length));
  return buckets.map((b, i) => `  ${head[i].padEnd(width)}  ${b.meaning}\n`).join('');
}

// The rows that need the owner: `{ kind, path, next }`, each followed by its next command.
export function needsLines(items) {
  const width = Math.max(...items.map((i) => i.kind.length));
  return items.map((i) => `  ${i.kind.padEnd(width)}  ${i.path}\n    next: ${i.next}\n`).join('');
}
