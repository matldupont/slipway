// The terminal look for sync's output (F-08, dev/features/cli-output.md; #164): whether it may colour and link,
// and text cleaned of control characters. Node built-ins only (D-015: sync is a zero-dependency script).
// It never reads stdin and never animates: sync runs spawnSync throughout, so nothing could draw a spinner.

import { styleText } from 'node:util';

// C0 controls except tab (U+0009) and newline (U+000A), DEL, and the C1 controls U+0080–U+009F.
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;
const HAS_CONTROL = /[\u0000-\u001F\u007F-\u009F]/;
const LINK_TERMS = new Set(['iTerm.app', 'vscode', 'WezTerm', 'ghostty', 'WarpTerminal']);

export const clean = (text) => String(text).replace(CONTROL, '');

export function ui(stream, env = process.env) {
  const tty = stream.isTTY === true;
  const forced = env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '' && env.FORCE_COLOR !== '0';
  const color = forced || (tty && !env.NO_COLOR && env.TERM !== 'dumb');
  const vte = Number.parseInt(env.VTE_VERSION ?? '', 10);
  const links = tty && env.FORCE_HYPERLINK !== '0'
    && (env.FORCE_HYPERLINK === '1' || LINK_TERMS.has(env.TERM_PROGRAM) || vte >= 5000);
  const width = tty && Number.isFinite(stream.columns) ? stream.columns : Infinity;

  const style = (format, text) => {
    const t = clean(text);
    return color ? styleText(format, t, { validateStream: false }) : t;
  };

  const link = (text, url) => {
    const t = clean(text);
    const u = String(url);
    if (!links || HAS_CONTROL.test(u) || !/^(https:|file:)/.test(u)) return t;
    return `\u001B]8;;${u}\u0007${t}\u001B]8;;\u0007`;
  };

  const section = (glyph, title) => {
    const g = glyph === '◆' ? style('yellow', glyph) : style('cyan', glyph);
    return `${g} ${style('bold', title)}`;
  };

  const line = (text, { indent = 0, last = false } = {}) =>
    `${style('dim', last ? '└' : '│')} ${' '.repeat(indent)}${clean(text)}`;

  return { tty, color, links, width, style, link, clean, section, line };
}
