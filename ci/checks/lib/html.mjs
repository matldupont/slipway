// HTML escaping for the pages ci/ writes (ci/roadmap.mjs, ci/work-order.mjs). Text from a project or from GitHub
// reaches a page only through one of these two, so a value can never land in markup raw. Both share one entity step.

import { escapeControl, UNSAFE } from './report.mjs';

const DROP = new RegExp(UNSAFE.source, 'gv');
const ENTITY = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const entities = (s) => s.replace(/[&<>"']/g, (c) => ENTITY[c]);

// For readers who do not read the repo (the public roadmap): control, format and bidi characters are dropped.
export const escapeHtml = (s) => entities(String(s).replace(DROP, ''));

// For the owner's own page (the work order): the same characters are kept visible as \uXXXX, so an odd title shows.
export const escapeShown = (s) => entities(escapeControl(s));
