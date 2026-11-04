import type { ReactNode } from 'react'; // no change
interface Props { open: boolean } // no change
export function Panel({ open }: Props): ReactNode {
  if (!open) return null;
  const note = open ? 'open' : 'closed';
  return <p hidden={!open && false}>{note}</p>;
}
export const wide = (width: number) => width >= 600;
