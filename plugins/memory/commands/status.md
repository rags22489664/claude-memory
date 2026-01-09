# /memory:status

Show memory system status.

## Instructions

Run these commands to gather status:

```bash
echo "=== Memory Status ==="
ls -la ~/.claude-memory/ 2>/dev/null || echo "No memory directory"
echo ""
echo "=== Buffer ==="
wc -l ~/.claude-memory/buffer.jsonl 2>/dev/null || echo "Buffer empty"
echo ""
echo "=== Index ==="
cd ~/.claude-memory && leann list 2>/dev/null || echo "No index"
```

Report:
- Whether the index exists
- Number of entries in buffer (pending indexing)
- Total size of memory directory
