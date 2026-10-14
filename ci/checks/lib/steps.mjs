// The eight steps of the slipway path (SLIPWAY.md, "Start here — the path") and where each one stands. The names live
// here and nowhere else: `pnpm status` prints them, and scripts/steps.test.mjs fails when the path table says another.
// The states are computed from facts `pnpm status` already holds, so a reader sees every step at once: the path is not
// one line (step 4 runs beside step 2, and step 7 sends the project back to 5).

export const STEPS = [
  { n: 0, name: 'Bootstrap' },
  { n: 1, name: 'Frame' },
  { n: 2, name: 'Test the risk' },
  { n: 3, name: 'Shape' },
  { n: 4, name: 'Walking skeleton' },
  { n: 5, name: 'Build loop' },
  { n: 6, name: 'Close the milestone' },
  { n: 7, name: 'Learn' },
];

export const stepName = (n) => STEPS[n].name;

export const STATES = ['done', 'in hand', 'waiting', 'not started', 'each milestone'];

// `f`:
//   bootstrapped, packages   AGENT.md has no placeholder row; the workspace's package count
//   frame                    the frame's status (`framed`, `draft`, …), or `missing` when there is no FRAME.md
//   frameTouched             FRAME.md is no longer the file slipway seeded
//   valueRisks, settled      the frame's value risks, and how many of them K1 would pass (risks.mjs `settled`);
//                            `scheduled`: how many of the others are scheduled or have a tracker
//   prdStatus, prdTouched    the PRD's Status (`missing` when there is no PRD), and whether it is no longer the seeded file
//   milestones               [{ status, kind }], `kind` being `skeleton` for the walking skeleton
// Returns the state of each step, in step order.
export function stepStates(f) {
  const unsettled = f.valueRisks - f.settled;
  const underway = (pred) => f.milestones.some((m) => m.status === 'active' && pred(m));
  const skeleton = (m) => m.kind === 'skeleton';
  const s = [];
  s[0] = f.bootstrapped && f.packages >= 1 ? 'done' : 'in hand';
  s[1] = f.frame === 'framed' ? 'done' : f.frame !== 'missing' && f.frameTouched ? 'in hand' : 'not started';
  // No value risk written yet is not a step 2 behind the author: it is done only once the frame is.
  s[2] = f.valueRisks === 0 ? (f.frame === 'framed' ? 'done' : 'not started') : unsettled === 0 ? 'done' : f.scheduled > 0 ? 'in hand' : 'not started';
  s[3] = f.prdStatus === 'missing' ? 'not started' : f.prdStatus !== 'draft' ? 'done' : f.prdTouched ? 'in hand' : 'not started';
  s[4] = f.milestones.some((m) => skeleton(m) && m.status === 'closed') ? 'done' : underway(skeleton) ? 'in hand' : 'not started';
  s[5] = underway((m) => !skeleton(m)) ? 'in hand' : unsettled > 0 ? 'waiting' : 'not started';
  s[6] = 'each milestone';
  s[7] = 'each milestone';
  return s;
}

// One line per step, as `pnpm status` prints it under Where things stand.
export const stepLines = (f) => stepStates(f).map((state, n) => `- Step ${n} · ${stepName(n)}: ${state}`);
