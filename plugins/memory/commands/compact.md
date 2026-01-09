# /memory:compact

Compact memory by summarizing old entries. This is a manual operation where you (Claude) will:

1. Export all memories
2. Identify old entries (>7 days)
3. Summarize them by project/topic
4. Rebuild the index with summaries

## Instructions

### Step 1: Export memories

```bash
cd ~/.claude-memory && leann search memory "*" --top-k 10000 > /tmp/all-memories.txt
```

### Step 2: Read and analyze

Read /tmp/all-memories.txt and identify:
- Recent entries (last 7 days) - keep as-is
- Old entries - group by project and topic

### Step 3: Summarize old entries

For each group of old entries, create a concise summary capturing:
- Key topics discussed
- Important decisions or findings
- Code patterns or solutions discovered

### Step 4: Rebuild index

Write the combined content (recent + summaries) to a temp file and rebuild:

```bash
# Write recent entries + summaries to /tmp/compacted.md
cd ~/.claude-memory
rm -rf .leann/indexes/memory
leann build memory --docs /tmp/compacted.md
```

### Step 5: Report

Tell the user:
- How many entries were processed
- How many were compacted into summaries
- New index size
