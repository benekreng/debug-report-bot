# Test Fixtures

This directory contains JSON fixtures for testing with real Discord thread data.

## Files

- `threads.example.json` - Example structure showing what the fixture looks like
- `threads.json` - Real thread data fetched from Discord (gitignored)

## Generating Fixtures

To fetch real threads from your Discord channel:

```bash
# Fetch 20 threads from OXI_ONE_BUGS channel (default)
node scripts/fetchThreads.js

# Fetch 10 threads from a specific channel
node scripts/fetchThreads.js <channelId> 10

# Examples
node scripts/fetchThreads.js 123456789 5
```

The script will:
1. Connect to Discord using your bot token from `.env`
2. Fetch active and archived threads from the specified channel
3. Download all messages (up to 100 per thread)
4. Serialize the data into a JSON file at `__tests__/fixtures/threads.json`

## Usage in Tests

Import the thread loader and use it to load fixture data:

```javascript
import { 
  loadThreadsFromFixture,
  getThreadById,
  getAllThreads,
  getRandomThread
} from '../loaders/threadLoader.js';

// Load all threads
const { threads, threadCount } = loadThreadsFromFixture();

// Get a specific thread
const thread = getThreadById('thread-id-here');

// Get all threads as an array
const allThreads = getAllThreads();

// Get a random thread
const randomThread = getRandomThread();
```

The loaded objects mimic Discord.js structures and can be used in place of mock factories.

## Data Structure

Each thread in the fixture contains:

```javascript
{
  id: string,
  name: string,
  parentId: string,
  type: number,
  archived: boolean,
  createdTimestamp: number,
  parent: { id, name },
  messages: [
    {
      id: string,
      content: string,
      author: { id, username, discriminator, tag, bot },
      channelId: string,
      createdTimestamp: number,
      attachments: [
        { id, url, contentType, size, filename }
      ]
    }
  ]
}
```

## Privacy Note

The `threads.json` file is gitignored to prevent committing real Discord data. Each developer should generate their own fixture file locally.
