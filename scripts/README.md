# Scripts

Utility scripts for development and testing.

## fetchThreads.js

Fetches Discord threads from a channel and saves them as JSON fixtures for testing.

### Usage

```bash
# Using npm script (recommended)
npm run fetch-threads

# Or directly with node
node scripts/fetchThreads.js [channelId] [numThreads]
```

### Examples

```bash
# Fetch 20 threads from default OXI_ONE_BUGS channel
npm run fetch-threads

# Fetch 10 threads from a specific channel
node scripts/fetchThreads.js 1234567890 10

# Fetch 5 threads from E16_BUGS channel
node scripts/fetchThreads.js 9876543210 5
```

### Output

Creates `__tests__/fixtures/threads.json` with the following structure:

```json
{
  "fetchedAt": "2026-02-05T12:00:00.000Z",
  "channelId": "1234567890",
  "channelName": "bug-reports",
  "threadCount": 20,
  "threads": [...]
}
```

### Requirements

- Discord bot token in `.env` file
- Bot must have access to read messages in the target channel
- Channel ID must be configured in `config.json` or provided as argument

### What Gets Fetched

For each thread:
- Thread metadata (id, name, creation time, parent channel)
- All messages (up to 100 per thread)
- User information for each message author
- Attachments (URLs, content types, file sizes)

### Notes

- Active threads are fetched first, then archived threads
- The script automatically sorts threads and takes the requested number
- Fetch can be run multiple times to refresh the fixture data
- Real data in `threads.json` is gitignored for privacy
