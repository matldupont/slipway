#!/usr/bin/env node
// Where a link: may land (ci/checks/lib/pnpm-lock.mjs `workspaceFolders`, and LK1 end to end): a workspace package
// folder inside the repository root, as the folder really is on disk. Internal: `pnpm meta` runs it in
// slipway, never in a project.

import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import test from 'node:test';
import { done, lk1, monorepo, project } from './lib/lk1-lockfile.mjs';

const verdict = (files, link) => {
  const dir = project(files);
  try {
    const r = lk1(dir);
    return { status: r.status, findings: (r.json?.findings ?? []).map((f) => f.where), broken: r.json?.broken };
  } finally {
    done(dir);
  }
};
const LINK_FINDING = 'pnpm-lock.yaml#importers/apps/api/@s/db@';

test('the root is not a workspace folder to link to', () => {
  const v = verdict(monorepo('workspace:*', 'link:../..'));
  assert.equal(v.status, 1);
  assert.deepEqual(v.findings, [`${LINK_FINDING}link:../..`]);
});

test('an absolute or Windows-style link is never a workspace folder', () => {
  for (const link of ['link:/packages/db', 'link:/../../packages/db', 'link://../../packages/db', 'link:C:/packages/db', 'link:..\\..\\packages\\db', 'link:\\\\server\\share']) {
    const v = verdict(monorepo('workspace:*', link));
    assert.equal(v.status, 1, link);
    assert.deepEqual(v.findings, [`${LINK_FINDING}${link}`], link);
  }
});

test('a workspace glob that leaves the repository root does not make its folder a link target', () => {
  for (const form of [(n) => `../${n}`, (n) => `packages/../../${n}`]) {
    const dir = project(monorepo());
    const name = `${basename(dir)}-outside`;
    const outside = join(dirname(dir), name);
    try {
      // a sibling folder with its own package.json, which the workspace names and a link points at
      mkdirSync(outside, { recursive: true });
      writeFileSync(join(outside, 'package.json'), JSON.stringify({ name: 'outside' }));
      writeFileSync(join(dir, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/*'\n  - '${form(name)}'\n`);
      writeFileSync(join(dir, 'pnpm-lock.yaml'), monorepo('workspace:*', `link:../../../${name}`)['pnpm-lock.yaml']);
      const r = lk1(dir);
      assert.equal(r.status, 1, `${form(name)}: ${r.out}`);
      assert.deepEqual(r.json.findings.map((f) => f.where), [`${LINK_FINDING}link:../../../${name}`]);
    } finally {
      done(dir);
      done(outside);
    }
  }
});

test('a symlinked workspace folder that points outside the repository root is not a link target', () => {
  const dir = project(monorepo());
  const outside = project({ 'package.json': JSON.stringify({ name: 'elsewhere' }), 'pnpm-lock.yaml': null });
  try {
    symlinkSync(outside, join(dir, 'packages', 'evil'));
    writeFileSync(join(dir, 'pnpm-lock.yaml'), monorepo('workspace:*', 'link:../../packages/evil')['pnpm-lock.yaml']);
    const r = lk1(dir);
    assert.equal(r.status, 1, r.out);
    assert.deepEqual(r.json.findings.map((f) => f.where), [`${LINK_FINDING}link:../../packages/evil`]);
    // one that stays inside the checkout is the folder it names
    symlinkSync(join(dir, 'packages', 'db'), join(dir, 'packages', 'alias'));
    writeFileSync(join(dir, 'pnpm-lock.yaml'), monorepo('workspace:*', 'link:../../packages/alias')['pnpm-lock.yaml']);
    assert.equal(lk1(dir).status, 0, 'a symlink to a folder inside the repository');
  } finally {
    done(dir);
    done(outside);
  }
});

test('node_modules and bower_components folders are not workspace packages, as pnpm treats them', () => {
  for (const folder of ['node_modules', 'bower_components']) {
    const files = { ...monorepo('workspace:*', `link:../../packages/${folder}`), [`packages/${folder}/package.json`]: JSON.stringify({ name: 'x' }) };
    const v = verdict(files);
    assert.equal(v.status, 1, folder);
    assert.deepEqual(v.findings, [`${LINK_FINDING}link:../../packages/${folder}`], folder);
  }
});
