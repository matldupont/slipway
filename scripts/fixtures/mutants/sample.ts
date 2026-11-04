import { limit } from './limit'; // no change
type Mode = 'on' | 'off' | true; // no change
const label = 'a === b && true'; // no change
export function clamp(value: number, max: number): number {
  if (value > max) {
    return max;
  }
  return value + 1;
}
export const ready = (flag: boolean) => flag === true;
