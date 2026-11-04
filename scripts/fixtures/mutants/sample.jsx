import React from 'react'; // no change
export function Badge({ count }) {
  if (count == 0) return null;
  return <b data-on={true}>{count}</b>;
}
export const same = (a, b) => a === b;
