import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { build } from 'vite';
import { blogPublishing, readPosts } from './blog.js';

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'rovewyn-blog-'));
  mkdirSync(path.join(root, 'blog'));
  writeFileSync(path.join(root, 'index.html'), '<!doctype html><html><body><!-- blog:room-posts --></body></html>');
  writeFileSync(path.join(root, 'blog/index.html'), '<!doctype html><html><body><!-- blog:archive --></body></html>');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function addPost(root, date, slug, overrides = {}) {
  const directory = path.join(root, 'blog', ...date.split('-'), slug);
  mkdirSync(directory, { recursive: true });
  const metadata = { title: 'A new note', date, summary: 'A short summary.', category: 'Experiment', ...overrides };
  writeFileSync(path.join(directory, 'post.json'), JSON.stringify(metadata));
  writeFileSync(path.join(directory, 'index.html'), '<!doctype html><html><head><link rel="stylesheet" href="./article.css"><script type="module" src="./article.js"></script></head><body><h1>Original article content.</h1></body></html>');
  writeFileSync(path.join(directory, 'article.css'), 'body { color: black; }');
  writeFileSync(path.join(directory, 'article.js'), 'document.body.dataset.ready = "true";');
  return directory;
}

test('adding a post publishes its page and assets and updates both lists without registering an entry', async t => {
  const root = fixture(t);
  addPost(root, '2025-12-31', 'earlier-note', { title: 'Earlier note' });
  addPost(root, '2026-10-11', 'new-note', { title: 'New <browser> & notes', summary: 'Quotes: "one" & <two>.' });
  await build({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: [blogPublishing(root)],
    build: { rolldownOptions: { input: { room: path.join(root, 'index.html'), blog: path.join(root, 'blog/index.html') } } },
  });
  const room = readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const archive = readFileSync(path.join(root, 'dist/blog/index.html'), 'utf8');
  for (const html of [room, archive]) {
    assert.match(html, /href="\/blog\/2026\/10\/11\/new-note\/"/);
    assert.match(html, /New &lt;browser&gt; &amp; notes/);
    assert.match(html, /Quotes: &quot;one&quot; &amp; &lt;two&gt;\./);
    assert.ok(html.indexOf('New &lt;browser&gt;') < html.indexOf('Earlier note'));
    assert.doesNotMatch(html, /<!-- blog:/);
  }
  assert.match(room, /11 October 2026/);
  assert.match(archive, /11 October</);
  assert.match(archive, /id="year-2026"/);
  assert.match(archive, /id="year-2025"/);
  for (const url of ['2026/10/11/new-note', '2025/12/31/earlier-note']) {
    const article = readFileSync(path.join(root, 'dist/blog', url, 'index.html'), 'utf8');
    assert.match(article, /<h1>Original article content\.<\/h1>/);
    const assets = [...article.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)];
    assert.ok(assets.some(([, asset]) => asset.endsWith('.css')));
    assert.ok(assets.some(([, asset]) => asset.endsWith('.js')));
    for (const [, asset] of assets) assert.ok(readFileSync(path.join(root, 'dist', asset)).length > 0);
  }
});

test('an article without metadata stops publication instead of being silently omitted', t => {
  const root = fixture(t);
  const directory = addPost(root, '2026-10-11', 'new-note');
  rmSync(path.join(directory, 'post.json'));
  assert.throws(() => readPosts(root), /Missing post\.json/);
});

test('metadata without an article stops publication', t => {
  const root = fixture(t);
  const directory = addPost(root, '2026-10-11', 'new-note');
  rmSync(path.join(directory, 'index.html'));
  assert.throws(() => readPosts(root), /Missing index\.html/);
});

test('invalid dates and dates that disagree with the permanent URL stop publication', t => {
  const root = fixture(t);
  const directory = addPost(root, '2026-02-30', 'new-note');
  assert.throws(() => readPosts(root), /Post date must be a valid date matching/);
  rmSync(directory, { recursive: true });
  addPost(root, '2026-10-11', 'new-note', { date: '2026-10-12' });
  assert.throws(() => readPosts(root), /Post date must be a valid date matching/);
});

test('missing listing fields stop publication with the metadata filename', t => {
  const root = fixture(t);
  const directory = addPost(root, '2026-10-11', 'new-note', { summary: '' });
  assert.throws(() => readPosts(root), error => error.message.includes('Missing or invalid summary') && error.message.includes(directory));
});
