import { limit } from './limit.js'; // no change
const label = 'x !== y || false'; // no change
export function clamp(value, max) {
  if (value < max) return value * 2;
  return max;
}
export const ready = (flag) => flag != null && true;
