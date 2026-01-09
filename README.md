# claude-memory

Semantic long-term memory for Claude Code powered by LEANN.

## Features

- **Simple architecture**: Buffer → LEANN index (no intermediate files)
- **Fast writes**: Append to buffer, batch reindex on search
- **Semantic search**: LEANN provides 97% storage savings with full semantic search
- **Deduplication**: Content hashing prevents duplicate entries
- **Session tracking**: Same memory won't be injected twice per session
- **Manual compaction**: `/memory:compact` lets Claude summarize old entries

## Architecture

```
~/.claude-memory/
├── .leann/indexes/memory/   # LEANN index
├── buffer.jsonl             # Pending entries (fast append)
├── hashes.json              # Content hashes for dedup
└── session.json             # Current session state
```

## Flow

```
┌─────────────────────────────────────────────────────────────┐
│  PostToolUse → append to buffer.jsonl (instant)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  UserPromptSubmit:                                          │
│    1. If buffer has 10+ entries or is 5min old → reindex   │
│    2. Search LEANN for relevant memories                    │
│    3. Filter already-injected (session dedup)               │
│    4. Inject as context                                     │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

Install LEANN globally:

```bash
uv tool install leann-core --with leann
leann --help  # Verify installation
```

## Installation

```bash
claude plugin add ~/path/to/claude-memory/plugins/memory
```

Or per-session:

```bash
claude --plugin-dir ~/path/to/claude-memory/plugins/memory
```

## Commands

| Command | Description |
|---------|-------------|
| `/memory:search <query>` | Semantic search through memory |
| `/memory:status` | Show index and buffer status |
| `/memory:compact` | Claude summarizes old entries |

## How Compaction Works

Unlike automated LRU compaction, this plugin lets Claude handle compaction on-demand:

```
User: /memory:compact

Claude: I'll analyze your memory and compact old entries.

Found 5,847 entries:
- 234 from last 7 days (keeping as-is)
- 5,613 older entries

Summarizing by project...
- "my-api": API authentication patterns, error handling...
- "frontend": React component patterns, state management...

Rebuilt index: 5,847 → 249 entries
```

This leverages Claude's understanding for better summaries than algorithmic compaction.

## Configuration

Thresholds in `hooks/UserPromptSubmit.js`:

```javascript
const REINDEX_THRESHOLD = 10;      // entries before reindex
const REINDEX_AGE_MS = 5 * 60000;  // 5 minutes
const TOP_K = 8;                   // memories to retrieve
```

## License

MIT
