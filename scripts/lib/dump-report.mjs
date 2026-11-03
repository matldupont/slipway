// A preload for scripts/report.test.mjs (`node --import`): every `@@json` line a check writes is also appended to
// the file REPORT_DUMP names, so the test reads the findings each check emits on its known-bad fixtures from the
// run PC1 already makes, and PC1 itself stays as it is. PC1 hands NODE_OPTIONS on to the checks it starts.
import { appendFileSync } from 'node:fs';

const file = process.env.REPORT_DUMP;
if (file) {
  const write = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, ...rest) => {
    for (const line of String(chunk).split('\n')) if (line.startsWith('@@json ')) appendFileSync(file, line + '\n');
    return write(chunk, ...rest);
  };
}
