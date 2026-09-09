import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const server = await readFile(new URL('../server.js', import.meta.url), 'utf8');

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

test('YouTube OAuth uses a bound state and the minimal default scope', () => {
  assert.match(server, /state\(u\.id,'youtube'\)/);
  assert.match(server, /youtube\.readonly/);
  assert.match(server, /YOUTUBE_ANALYTICS_ENABLED/);
  assert.match(server, /YouTube-API-Fehler/);
});

test('social connection migration protects token columns', async () => {
  const migration = await readFile(new URL('../supabase/migrations/202609090001_social_connections.sql', import.meta.url), 'utf8');
  assert.match(migration, /enable row level security/);
  assert.match(migration, /grant select \(platform, account_id, handle, status\)/);
  assert.doesNotMatch(migration, /grant select \([^)]*access_token/);
});
