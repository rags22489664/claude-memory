/**
 * PostToolUse hook - Capture tool outputs to memory buffer
 * Fast append-only, no LEANN indexing here
 */
import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { BUFFER_PATH, HASHES_PATH, ensureDir } from '../lib/leann.js';

const SKIP_TOOLS = ['TodoRead', 'TodoWrite', 'Task'];
const MAX_CONTENT_LENGTH = 5000;

export default async function PostToolUse({ tool, input, output, project, cwd }) {
  // Skip non-useful tools
  if (SKIP_TOOLS.includes(tool?.name)) {
    return { continue: true };
  }

  ensureDir();

  // Format content
  const content = formatContent(tool, input, output);
  if (!content || content.length < 20) {
    return { continue: true };
  }

  // Dedup check
  const hash = createHash('md5').update(content).digest('hex').slice(0, 16);
  const hashes = loadHashes();
  if (hashes[hash]) {
    return { continue: true };
  }

  // Create entry
  const entry = {
    id: crypto.randomUUID().slice(0, 8),
    ts: new Date().toISOString(),
    project: project || 'unknown',
    type: `tool:${tool?.name || 'unknown'}`,
    content: content.slice(0, MAX_CONTENT_LENGTH),
    hash
  };

  // Append to buffer
  appendFileSync(BUFFER_PATH, JSON.stringify(entry) + '\n');

  // Track hash
  hashes[hash] = Date.now();
  writeFileSync(HASHES_PATH, JSON.stringify(hashes));

  return { continue: true };
}

function formatContent(tool, input, output) {
  const toolName = tool?.name || 'unknown';
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
  const outputStr = typeof output === 'string' ? output : JSON.stringify(output);

  return `Tool: ${toolName}\nInput: ${inputStr.slice(0, 500)}\nOutput: ${outputStr.slice(0, 4000)}`;
}

function loadHashes() {
  try {
    return existsSync(HASHES_PATH)
      ? JSON.parse(readFileSync(HASHES_PATH, 'utf8'))
      : {};
  } catch {
    return {};
  }
}
