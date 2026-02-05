# Testing Guide

This directory contains tests for the Discord bug report bot.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Test Structure

### Factories (`factories/discord.js`)

Discord object factories that create mock Discord.js objects for testing:

- `createMockUser()` - Creates a fake Discord user
- `createMockMessage()` - Creates a fake Discord message
- `createMockThread()` - Creates a fake Discord thread channel
- `createMockClient()` - Creates a fake Discord client
- `createMockAttachment()` - Creates a fake Discord attachment
- `createMessageCollection()` - Creates a collection of messages

### Test Files

- `messageHandler.test.js` - Tests for the message handling logic

## Test Coverage

The tests cover:

1. **ThreadTracker** - State management for thread tracking
   - Adding threads to tracking
   - Finding threads in the processing queue
   - Updating thread timestamps
   - Removing threads from processing/tracking
   - Getting threads due for processing

2. **handleMessageCreate** - Message creation event handler
   - Ignoring bot messages
   - Resetting timers for tracked threads
   - Handling messages in untracked threads

3. **formatThreadMessages** - Message formatting
   - Single and multiple messages
   - Messages with attachments
   - Empty message collections

4. **processThread** - Thread processing
   - Successfully processing threads
   - Handling fetch failures
   - Channel permission checks
   - Empty message handling

5. **checkForTimeout** - Timeout checking
   - Processing threads that have timed out
   - Processing oldest threads first

## Mocking LangChain

The tests use dependency injection to mock the LangChain `processMessageCollection` function:

```javascript
const mockProcessMessageCollection = jest.fn().mockResolvedValue('AI response here');
await processThread(threadId, mockClient, allowedChannels, tracker, mockProcessMessageCollection);
```

This allows tests to run without requiring actual LangChain/OpenAI API calls.
