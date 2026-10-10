import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';

const fields = ['title', 'date', 'summary', 'category'];

export function readPosts(root) {
  const blogRoot = path.join(root, 'blog');
  const posts = [];

  function visit(directory) {
    const entries = readdirSync(directory, { withFileTypes: true });
    const metadataFile = path.join(directory, 'post.json');
    const articleFile = path.join(directory, 'index.html');
    const isArticle = directory !== blogRoot && existsSync(articleFile);
    const hasMetadata = existsSync(metadataFile);
    if (isArticle && !hasMetadata) throw new Error(`Missing post.json for ${articleFile}`);
    if (hasMetadata) {
      if (!isArticle) throw new Error(`Missing index.html for ${metadataFile}`);
      let metadata;
      try {
        metadata = JSON.parse(readFileSync(metadataFile, 'utf8'));
      } catch (error) {
        throw new Error(`Invalid JSON in ${metadataFile}: ${error.message}`, { cause: error });
      }
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        throw new Error(`Expected a metadata object in ${metadataFile}`);
      }
      for (const field of fields) {
        if (typeof metadata[field] !== 'string' || !metadata[field].trim()) {
          throw new Error(`Missing or invalid ${field} in ${metadataFile}`);
        }
      }
      const relative = path.relative(blogRoot, directory).split(path.sep).join('/');
      const match = relative.match(/^(\d{4})\/(\d{2})\/(\d{2})\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
      const date = match && `${match[1]}-${match[2]}-${match[3]}`;
      const parsed = new Date(`${metadata.date}T00:00:00Z`);
      if (!date || metadata.date !== date || !Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
        throw new Error(`Post date must be a valid date matching blog/YYYY/MM/DD/slug in ${metadataFile}`);
      }
      posts.push({ ...metadata, url: `/blog/${relative}/`, file: articleFile });
    }
    for (const entry of entries) {
      if (entry.isDirectory()) visit(path.join(directory, entry.name));
    }
  }

  visit(blogRoot);
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.url.localeCompare(b.url));
}

const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function postLink(post, room) {
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', ...(room ? { year: 'numeric' } : {}), timeZone: 'UTC',
  }).format(new Date(`${post.date}T00:00:00Z`));
  const metaTag = room ? 'span' : 'div';
  return `<a class="${room ? 'blog-post' : 'post-link'}" href="${post.url}" target="_blank" rel="noopener noreferrer">
  <${metaTag} class="post-meta"><time datetime="${post.date}">${date}</time><span>${escapeHtml(post.category)}</span></${metaTag}>
  <h3>${escapeHtml(post.title)}</h3>
  <p>${escapeHtml(post.summary)}</p>
  <span class="${room ? 'post-read' : 'read-link'}">Read post <span aria-hidden="true">↗</span></span>
</a>`;
}

export function renderRoomPosts(posts) {
  return `<ol class="blog-posts" aria-label="Blog posts">
${posts.map(post => `  <li>${postLink(post, true)}</li>`).join('\n')}
</ol>`;
}

export function renderArchive(posts) {
  const years = [...new Set(posts.map(post => post.date.slice(0, 4)))];
  return years.map(year => `<section class="year-group" aria-labelledby="year-${year}">
  <h2 id="year-${year}">${year}</h2>
  <ol class="post-list">
${posts.filter(post => post.date.startsWith(year)).map(post => `    <li><article>${postLink(post, false)}</article></li>`).join('\n')}
  </ol>
</section>`).join('\n');
}

export function blogPublishing(root) {
  root = realpathSync(root);
  const blogRoot = path.join(root, 'blog');
  return {
    name: 'blog-publishing',
    config() {
      const posts = readPosts(root);
      return {
        build: {
          rolldownOptions: {
            input: Object.fromEntries(posts.map(post => [post.url.slice(1, -1).replaceAll('/', '-'), post.file])),
          },
        },
      };
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const relative = path.relative(root, context.filename).split(path.sep).join('/');
        const marker = relative === 'index.html' ? '<!-- blog:room-posts -->' : relative === 'blog/index.html' ? '<!-- blog:archive -->' : null;
        if (!marker) return html;
        if (html.split(marker).length !== 2) throw new Error(`Expected exactly one ${marker} in ${context.filename}`);
        const posts = readPosts(root);
        return html.replace(marker, () => relative === 'index.html' ? renderRoomPosts(posts) : renderArchive(posts));
      },
    },
    configureServer(server) {
      // Metadata changes affect both HTML lists, including newly added posts.
      const reload = file => {
        if (file.startsWith(`${blogRoot}${path.sep}`) && path.basename(file) === 'post.json') {
          server.ws.send({ type: 'full-reload' });
        }
      };
      server.watcher.on('add', reload).on('change', reload).on('unlink', reload);
      server.httpServer?.once('close', () => {
        server.watcher.off('add', reload).off('change', reload).off('unlink', reload);
      });
    },
  };
}
