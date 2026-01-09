/**
 * UserPromptSubmit hook - Reindex buffer if needed, then search and inject context
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { BUFFER_PATH, SESSION_PATH, MEMORY_DIR, INDEX_NAME, ensureDir, indexExists, search } from '../lib/leann.js';
import { join } from 'path';

const REINDEX_THRESHOLD = 10; // entries
const REINDEX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const TOP_K = 8;

export default async function UserPromptSubmit({ prompt }) {
  ensureDir();

  // Reindex buffer if needed
  await maybeReindexBuffer();

  // Skip search for short prompts
  if (!prompt || prompt.length < 10) {
    return { continue: true };
  }

  // Search for relevant memories
  if (!indexExists()) {
    return { continue: true };
  }

  const { results, error } = search(prompt, TOP_K);
  if (error || results.length === 0) {
    return { continue: true };
  }

  // Filter already-injected this session
  const session = loadSession();
  const newResults = results.filter(r => !session.injected.includes(hashContent(r.content)));

  if (newResults.length === 0) {
    return { continue: true };
  }

  // Track injected
  newResults.forEach(r => session.injected.push(hashContent(r.content)));
  writeFileSync(SESSION_PATH, JSON.stringify(session));

  // Format context
  const context = formatMemories(newResults);

  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: context
    }
  };
}

async function maybeReindexBuffer() {
  if (!existsSync(BUFFER_PATH)) return;

  const stats = statSync(BUFFER_PATH);
  const content = readFileSync(BUFFER_PATH, 'utf8').trim();
  if (!content) return;

  const lines = content.split('\n');
  const age = Date.now() - stats.mtimeMs;

  // Only reindex if threshold met
  if (lines.length < REINDEX_THRESHOLD && age < REINDEX_AGE_MS) {
    return;
  }

  // Convert buffer to markdown for LEANN
  const entries = lines.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  const markdown = entries.map(e =>
    `## [${e.id}] [${e.ts}] [${e.project}] ${e.type}\n${e.content}`
  ).join('\n\n');

  const tempFile = join(MEMORY_DIR, `batch-${Date.now()}.md`);
  writeFileSync(tempFile, markdown);

  try {
    // Build/update index
    execSync(`leann build ${INDEX_NAME} --docs "${tempFile}" --force`, {
      cwd: MEMORY_DIR,
      stdio: 'pipe',
      timeout: 120000
    });

    // Clear buffer on success
    unlinkSync(BUFFER_PATH);
    unlinkSync(tempFile);
  } catch (err) {
    console.error('Reindex failed:', err.message);
    try { unlinkSync(tempFile); } catch {}
  }
}

function loadSession() {
  try {
    return existsSync(SESSION_PATH)
      ? JSON.parse(readFileSync(SESSION_PATH, 'utf8'))
      : { injected: [] };
  } catch {
    return { injected: [] };
  }
}

function hashContent(content) {
  const { createHash } = require('crypto');
  return createHash('md5').update(content).digest('hex').slice(0, 12);
}

function formatMemories(results) {
  const formatted = results.map(r => `- ${r.content.slice(0, 200)}...`).join('\n');
  return `[Memory: ${results.length} relevant entries]\n\n${formatted}`;
}
