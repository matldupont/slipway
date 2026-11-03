// An owed thing: one line of what `pnpm status` asks of a person, as data (F-17 §1 and §2, dev/features/parallel-plan.md).
// Every line status prints for a person, bar the Next line, the state lines and the headers that stand over check rows, is
// built here by thing() from the kind's row in KINDS, so who acts, what it blocks, what it waits on and which files it writes are said once per kind and read
// by the planner (plan.mjs). Zero dependencies, no process.exit.
//
//   { kind, key, who, text, blocks: { rank, words, date }, waits, files }
//
// A thing may also carry `line`: the whole line status printed before the plan existed. Until status prints the plan,
// line() gives that text unchanged, so a thing built with one prints as it did; a thing without one prints in §1's form.

export const WHO = ['you', 'you and an agent', 'agent', 'you or an agent', 'fresh session', 'nobody'];
// The owner is busy on the main step when its who, read from §4's table, is one of these (`yours` is STEPS' word for step 2).
const OWNER = ['you', 'yours', 'you and an agent'];
// Whether work of this who is the owner's: the person rule offers at most one such thing at a time.
export const ownerWork = (who) => who === 'you' || who === 'you and an agent';
export const ownerBusy = (who) => OWNER.includes(who);

const DOCS_REVIEWS = ['docs/reviews/**'];
const CLOSING = 'the active milestone closing';
const NOTHING = 'nothing status tracks';

// §2's table, in the order status prints the kinds; plan.mjs sorts a rank by it. A row with no `files` writes a file set
// the caller reads from the tree and passes in; `[]` writes none. §5's and §6's kinds follow §2's, with the rows' own facts.
export const KINDS = {
  'prd-review': { who: 'fresh session', rank: 2, words: "the PRD's approval, which a milestone needs", files: DOCS_REVIEWS },
  'prd-approve': { who: 'you', rank: 2, words: "the PRD's approval, which the next milestone needs", files: ['docs/PRD.md'] },
  'agent-rows': { who: 'you', rank: 5, words: 'the skills that read them', files: ['AGENT.md'] },
  'risk-test': { who: 'you', rank: 2, words: 'every milestone past the skeleton', files: ['docs/product/evidence/**', 'docs/product/FRAME.md'] },
  'build-ahead': { who: 'you', rank: 5, words: 'nothing: it is a choice, not owed', files: ['decisions.md', 'docs/product/FRAME.md'] },
  'risk-tracker': { who: 'you or an agent', rank: 2, words: 'the checks, once a milestone past the skeleton is underway', files: ['docs/product/FRAME.md'] },
  skeleton: { who: 'agent', rank: 2, words: 'the skeleton milestone, which every later milestone builds on' },
  register: { who: 'you or an agent', rank: 5, words: NOTHING },
  'feature-review': { who: 'fresh session', rank: 3, words: "the feature's build tickets", files: DOCS_REVIEWS },
  design: { who: 'you or an agent', rank: 2, words: 'a milestone going active', files: ['docs/milestones/**'] },
  'design-frame': { who: 'you', rank: 2, words: "every shaping milestone's design check", files: ['docs/product/FRAME.md'] },
  existential: { who: 'you', rank: 2, words: 'the first bet going active', files: ['docs/PRD.md', 'docs/product/FRAME.md'] },
  // Not in §2: a milestone whose `id:` is not text. Status skips it and says so, and the file is the milestone's own.
  'odd-id': { who: 'you', rank: 5, words: NOTHING },
  'open-decision': { who: 'you', rank: 5, words: NOTHING, files: ['decisions.md'] },
  'owed-citation': { who: 'you or an agent', rank: 3, words: "the feature's review and build" },
  'decision-reopens': { who: 'you', rank: 3, words: 'anything new built on it', files: ['decisions.md'] },
  'decision-closes': { who: 'you or an agent', rank: 5, words: NOTHING, files: ['decisions.md'] },
  'decision-unreadable': { who: 'you or an agent', rank: 5, words: NOTHING, files: ['decisions.md'] },
  'decision-stray': { who: 'you or an agent', rank: 5, words: NOTHING, files: ['decisions.md'] },
  'decision-folder': { who: 'you or an agent', rank: 5, words: NOTHING, files: ['decisions.md'] },
  'open-question': { who: 'you', rank: 5, words: NOTHING },
  'owed-check': { who: 'you or an agent', rank: 1, words: CLOSING },
  'failed-check': { who: 'you or an agent', rank: 1, words: CLOSING },
  'unreadable-check': { who: 'you or an agent', rank: 1, words: CLOSING },
  parked: { who: 'nobody', rank: 5, words: NOTHING, waits: 'its tracker', files: [] },
  lesson: { who: 'you', rank: 4, words: 'its date' },
  shape: { who: 'you and an agent', rank: 1, words: "the milestone's next builds", files: ['docs/milestones/**', 'docs/features/**', 'dev/features/**', 'docs/PRD.md', 'decisions.md'] },
  'github-unread': { who: 'you', rank: 5, words: NOTHING, waits: 'GitHub', files: [] },
  'stale-claim': { who: 'you', rank: 5, words: NOTHING, files: [] },
  unplannable: { who: 'you', rank: 5, words: NOTHING, files: [] },
  'review-unchecked': { who: 'you', rank: 5, words: NOTHING, files: [] },
  'branches-unread': { who: 'you', rank: 5, words: NOTHING, files: [] },
  'other-account': { who: 'you', rank: 5, words: NOTHING, files: [] },
  merge: { who: 'you', rank: 5, words: NOTHING, files: [] },
  'review-owed': { who: 'fresh session', rank: 3, words: 'a pull request going ready, which the pull-request check holds', files: DOCS_REVIEWS },
  'red-check': { who: 'you or an agent', rank: 5, words: NOTHING },
  'needs-shape': { who: 'you and an agent', rank: 3, words: "the issue's build", files: ['docs/features/**', 'dev/features/**', 'docs/milestones/**', 'decisions.md'] },
};

export const KIND_ORDER = Object.keys(KINDS);

// A `waits` that names another thing is one of its keys (a kind, then the ids it names); anything else is a fixed phrase.
export const isKey = (w) => typeof w === 'string' && /^[a-z][a-z-]*(?::[^\s:]+)*$/.test(w) && Object.hasOwn(KINDS, w.split(':')[0]);

// A text that stops without a full stop gets one, so what follows it (the form's sentences, the plan's offline sentence) starts a sentence.
const stopped = (text) => (text === '' || /[.!?]$/.test(text) ? text : `${text}.`);

// An owed thing of `kind`, with the kind's facts and the caller's: `text`, plus whatever the line knows that the kind does
// not (`key`, `who`, `rank`, `words`, `date`, `waits`, `waitsWords`, `files`, `line`). `files` has no default for a kind
// whose set depends on the tree: leaving it out is a mistake, and null says the files are unknown.
export function thing(kind, f = {}) {
  const k = KINDS[kind];
  if (!k || !Object.hasOwn(KINDS, kind)) throw new Error(`owed: no kind ${String(kind)}`);
  const who = f.who ?? k.who;
  if (!WHO.includes(who)) throw new Error(`owed: ${kind} has no who ${String(who)}`);
  const files = 'files' in f ? f.files : k.files;
  if (files !== null && !Array.isArray(files)) throw new Error(`owed: ${kind} needs its files (an array, or null for unknown)`);
  const waits = 'waits' in f ? f.waits : k.waits ?? null;
  if (isKey(waits) && !f.waitsWords) throw new Error(`owed: ${kind} waits on ${waits} and needs waitsWords`);
  const t = {
    kind,
    key: f.key ?? kind,
    who,
    text: stopped(f.text ?? ''),
    blocks: { rank: f.rank ?? k.rank, words: f.words ?? k.words, date: f.date ?? null },
    waits,
    files,
  };
  if (f.waitsWords) t.waitsWords = f.waitsWords;
  if (f.line !== undefined) t.line = f.line;
  return t;
}

// What the thing waits on, in words: nothing, the phrase it holds, or the words for the key it holds.
const waitsIn = (t) => (t.waits === null ? 'nothing' : isKey(t.waits) ? t.waitsWords : t.waits);

// §1's form: `(who) {text} [It can start now, after the steps above.] It blocks {words}. It waits on {waits}.`; `nobody` prints no
// parenthesis. The sentence for a startable thing is the plan's (plan.mjs sets `startable` on what it leaves in `rest`), and
// never for rank 5.
export const form = (t) => `${t.who === 'nobody' ? '' : `(${t.who}) `}${stopped(t.text)}${t.startable && t.blocks.rank <= 4 ? ' It can start now, after the steps above.' : ''} It blocks ${t.blocks.words}. It waits on ${waitsIn(t)}.`;

// The line status prints for a thing: the one it printed before the plan, while the thing holds it.
export const line = (t) => t.line ?? form(t);
