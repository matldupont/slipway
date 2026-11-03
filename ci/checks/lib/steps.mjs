// The eight steps of the slipway path (SLIPWAY.md, "Start here — the path") and where each one stands. The names live
// here and nowhere else: `pnpm status` prints them, and scripts/steps.test.mjs fails when the path table says another.
// The states are computed from facts `pnpm status` already holds, so a reader sees every step at once: the path is not
// one line (step 4 runs beside step 2, and step 7 sends the project back to 5).

// `who` and `time` are the path table's two cells for the step; `pnpm status` builds the last sentence of the Next line
// from them (`whoLine`) and never spells either itself. scripts/steps.test.mjs holds the table to this list.
export const STEPS = [
  { n: 0, name: 'Bootstrap', who: 'you and an agent', time: '1 to 2 hours' },
  { n: 1, name: 'Frame', who: 'you', time: 'an afternoon' },
  { n: 2, name: 'Test the risk', who: 'yours', time: 'days to weeks' },
  { n: 3, name: 'Shape', who: 'you', time: '1 to 2 days' },
  { n: 4, name: 'Walking skeleton', who: 'agent', time: 'days' },
  { n: 5, name: 'Build loop', who: 'agent', time: 'one issue per session' },
  { n: 6, name: 'Close the milestone', who: 'you', time: 'an afternoon' },
  { n: 7, name: 'Learn', who: 'you', time: 'weekly' },
];

export const stepName = (n) => STEPS[n].name;

// The sentence that closes a Next line: who does the step, and how long it takes ("Yours, days to weeks.").
export const whoLine = (n) => `${STEPS[n].who[0].toUpperCase()}${STEPS[n].who.slice(1)}, ${STEPS[n].time}.`;

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

// What each step blocks while it is not done, in the words of §4's step lines (F-17); step 2's are the caller's (`riskBlocks`),
// since they say which milestones an untested value risk holds. Steps 6 and 7 are not a step to finish: they print who and nothing more.
const BLOCKS = [
  'every other step',
  'the PRD and every milestone',
  null,
  'a milestone going active',
  'nothing status tracks',
  'the active milestone closing',
];

// One line per step, as `pnpm status` prints it under Where things stand: a step not done says who acts, what it blocks and
// what it waits on (F-17 §4); `f.riskBlocks` is what an untested value risk holds back.
export const stepLines = (f) => stepStates(f).map((state, n) => {
  const head = `- Step ${n} · ${stepName(n)}: `;
  const who = STEPS[n].who[0].toUpperCase() + STEPS[n].who.slice(1);
  if (state === 'done') return `${head}done.`;
  if (n >= 6) return `${head}${state}. ${who}.`;
  const blocks = n === 2 ? f.riskBlocks : BLOCKS[n];
  const waits = n === 5 && state === 'waiting' ? "the value risks' results" : 'nothing';
  return `${head}${state}. ${who}. It blocks ${blocks}. It waits on ${waits}.`;
});
