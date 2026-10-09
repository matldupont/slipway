describe.skip('no link', () => {});
it.skip('linked', () => {}); // #12
xit('x-prefixed, no link', () => {});
test.skipIf(process.env.CI)('conditional, no link', () => {});
it.todo('later');
it.only('focused, even with a link', () => {}); // #14
fdescribe('focused group', () => {});
// it.skip('a comment is read as text')
it('says skip in its title only', () => {});
test.runIf(process.env.X)('linked elsewhere', () => {}); // owner/repo#5
it.skip('a decision id is not an issue', () => {}); // D-7
