/**
 * Stop hook - Capture session summary when agent stops
 */
import { appendFileSync } from 'fs';
import { createHash } from 'crypto';
import { BUFFER_PATH, ensureDir } from '../lib/leann.js';

export default async function Stop({ project, summary }) {
  // Only capture if there's meaningful content
  if (!summary || summary.length < 50) {
    return { continue: true };
  }

  ensureDir();

  const entry = {
    id: crypto.randomUUID().slice(0, 8),
    ts: new Date().toISOString(),
    project: project || 'unknown',
    type: 'session-summary',
    content: `Session Summary:\n${summary}`,
    hash: createHash('md5').update(summary).digest('hex').slice(0, 16)
  };

  appendFileSync(BUFFER_PATH, JSON.stringify(entry) + '\n');

  return { continue: true };
}
