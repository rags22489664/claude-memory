/**
 * SessionStart hook - Reset session state on new session or /clear
 */
import { writeFileSync, existsSync, readFileSync, statSync } from 'fs';
import { SESSION_PATH, BUFFER_PATH, ensureDir, indexExists, getStatus } from '../lib/leann.js';

export default async function SessionStart({ sessionId }) {
  ensureDir();

  // Reset session state
  writeFileSync(SESSION_PATH, JSON.stringify({
    id: sessionId || crypto.randomUUID().slice(0, 8),
    startedAt: new Date().toISOString(),
    injected: []
  }));

  // Get status
  const status = getStatus();

  // Build status message
  let message = 'Long-term memory initialized';
  if (status.indexExists) {
    message += ' (index ready)';
  } else if (status.bufferEntries > 0) {
    message += ` (${status.bufferEntries} entries pending index)`;
  } else {
    message += ' (empty)';
  }

  return {
    continue: true,
    systemMessage: message
  };
}
