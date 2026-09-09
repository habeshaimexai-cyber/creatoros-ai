import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('content studio exposes the essential controls', () => {
  for (const id of ['topic', 'platform', 'language', 'goal', 'tone', 'generate', 'result']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test('content library and legal pages are linked', () => {
  assert.match(html, /id="drafts"/);
  assert.match(html, /href="privacy\.html"/);
  assert.match(html, /href="terms\.html"/);
});

test('dynamic result values are escaped before rendering', () => {
  assert.match(html, /function esc\(v\)/);
  assert.match(html, /esc\(r\.title\)/);
  assert.match(html, /esc\(r\.script\)/);
});
