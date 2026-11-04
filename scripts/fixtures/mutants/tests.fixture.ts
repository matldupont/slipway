import { clamp } from './sample';
beforeEach(() => {
  reset();
});
function helper(x: number) {
  return x + 1;
}
it('one', () => {
  expect(clamp(5, 3)).toBe(3);
});
test.skip('two', async () => {
  expect(
    clamp(
      1,
      2,
    ),
  ).toBe(2);
});
it.each([
  [1, 2],
  [3, 4],
  [5, 6],
])('rows %i', (a, b) => {
  expect(a < b).toBe(true);
});
