/**
 * LEANN wrapper for claude-memory
 */
import { execSync } from 'child_process';
import { existsSync, mkdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const MEMORY_DIR = join(homedir(), '.claude-memory');
export const INDEX_NAME = 'memory';
export const BUFFER_PATH = join(MEMORY_DIR, 'buffer.jsonl');
export const HASHES_PATH = join(MEMORY_DIR, 'hashes.json');
export const SESSION_PATH = join(MEMORY_DIR, 'session.json');

export function ensureDir() {
  if (!existsSync(MEMORY_DIR)) {
    mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

export function indexExists() {
  // Check for .leann directory created by leann build
  const indexPath = join(MEMORY_DIR, '.leann', 'indexes', INDEX_NAME);
  return existsSync(indexPath);
}

export function buildIndex(contentFile, options = {}) {
  ensureDir();
  const args = ['build', INDEX_NAME, '--docs', contentFile];
  if (options.force) args.push('--force');

  try {
    execSync(`leann ${args.join(' ')}`, {
      cwd: MEMORY_DIR,
      stdio: 'pipe',
      timeout: 120000
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.stderr?.toString() || err.message };
  }
}

export function search(query, topK = 10) {
  if (!indexExists()) {
    return { results: [], error: 'Index not found' };
  }

  try {
    const escaped = query.replace(/"/g, '\\"').replace(/\$/g, '\\$');
    const result = execSync(
      `leann search ${INDEX_NAME} "${escaped}" --top-k ${topK}`,
      { cwd: MEMORY_DIR, stdio: 'pipe', timeout: 30000, encoding: 'utf8' }
    );

    const lines = result.trim().split('\n').filter(Boolean);
    const results = lines.map((line) => {
      const match = line.match(/^([\d.]+)\t(.*)$/);
      return match
        ? { score: parseFloat(match[1]), content: match[2] }
        : { score: 0, content: line };
    });

    return { results };
  } catch (err) {
    return { results: [], error: err.message };
  }
}

export function getStatus() {
  ensureDir();
  const bufferSize = existsSync(BUFFER_PATH) ? statSync(BUFFER_PATH).size : 0;
  const bufferLines = bufferSize > 0
    ? require('fs').readFileSync(BUFFER_PATH, 'utf8').trim().split('\n').length
    : 0;

  return {
    indexExists: indexExists(),
    bufferEntries: bufferLines,
    memoryDir: MEMORY_DIR
  };
}
