// A worker the stand-in runner leaves behind: it sleeps, so only a stop from outside ends it. Given a number of
// milliseconds, it takes that long to stop after SIGTERM.
const slow = Number(process.argv[2] ?? 0);
if (slow) process.on('SIGTERM', () => setTimeout(() => process.exit(143), slow));
setInterval(() => {}, 1000);
