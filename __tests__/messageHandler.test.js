import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  ThreadTracker,
  handleMessageCreate,
  formatThreadMessages,
  processThread,
  checkForTimeout
} from '../lib/messageHandler.js';
import {
  createMockMessage,
  createMockUser,
  createMockThread,
  createMockClient,
  createMessageCollection,
  createMockAttachment
} from './factories/discord.js';

describe('ThreadTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ThreadTracker();
  });

  it('should add a thread to tracking', () => {
    tracker.addThread('thread123', 'channel456');
    
    expect(tracker.threadsWaiting).toHaveLength(1);
    expect(tracker.trackedThreads).toHaveLength(1);
    expect(tracker.threadsWaiting[0].threadId).toBe('thread123');
    expect(tracker.threadsWaiting[0].channelId).toBe('channel456');
  });

  it('should find a thread in waiting queue', () => {
    tracker.addThread('thread123', 'channel456');
    const idx = tracker.findThreadInWaiting('thread123');
    
    expect(idx).toBe(0);
  });

  it('should return -1 for thread not in queue', () => {
    const idx = tracker.findThreadInWaiting('nonexistent');
    
    expect(idx).toBe(-1);
  });

  it('should update thread timestamp', () => {
    const oldTimestamp = Date.now() - 10000;
    tracker.addThread('thread123', 'channel456', oldTimestamp);
    
    const newTimestamp = Date.now();
    const updated = tracker.updateThreadTimestamp('thread123', newTimestamp);
    
    expect(updated).toBe(true);
    expect(tracker.threadsWaiting[0].timestamp).toBe(newTimestamp);
  });

  it('should remove thread from waiting queue', () => {
    tracker.addThread('thread123', 'channel456');
    tracker.removeThreadFromWaiting('thread123');
    
    expect(tracker.threadsWaiting).toHaveLength(0);
  });

  it('should remove thread from tracking', () => {
    tracker.addThread('thread123', 'channel456');
    tracker.removeThreadFromTracking('thread123');
    
    expect(tracker.trackedThreads).toHaveLength(0);
  });

  it('should get threads due for processing', () => {
    const now = Date.now();
    const oldTimestamp = now - (6 * 60 * 1000); // 6 minutes ago
    const recentTimestamp = now - (2 * 60 * 1000); // 2 minutes ago
    
    tracker.addThread('oldThread', 'channel1', oldTimestamp);
    tracker.addThread('recentThread', 'channel2', recentTimestamp);
    
    const timeout = 5 * 60 * 1000; // 5 minutes
    const dueThreads = tracker.getThreadsDueForProcessing(timeout);
    
    expect(dueThreads).toHaveLength(1);
    expect(dueThreads[0].threadId).toBe('oldThread');
  });

  it('should sort threads by timestamp when getting due threads', () => {
    const now = Date.now();
    tracker.addThread('thread1', 'channel1', now - (10 * 60 * 1000));
    tracker.addThread('thread2', 'channel2', now - (8 * 60 * 1000));
    tracker.addThread('thread3', 'channel3', now - (12 * 60 * 1000));
    
    const dueThreads = tracker.getThreadsDueForProcessing(5 * 60 * 1000);
    
    expect(dueThreads).toHaveLength(3);
    expect(dueThreads[0].threadId).toBe('thread3'); // oldest first
  });
});

describe('handleMessageCreate', () => {
  let tracker;

  beforeEach(() => {
    tracker = new ThreadTracker();
  });

  it('should ignore bot messages', () => {
    const botUser = createMockUser({ bot: true });
    const message = createMockMessage({ author: botUser });
    
    const result = handleMessageCreate(message, tracker);
    
    expect(result.handled).toBe(false);
    expect(result.reason).toBe('bot_message');
  });

  it('should reset timer for tracked thread', () => {
    const threadId = 'thread123';
    tracker.addThread(threadId, 'channel456', Date.now() - 100000);
    
    const message = createMockMessage({
      channelId: threadId,
      channel: { id: threadId, type: 11 }
    });
    
    const result = handleMessageCreate(message, tracker);
    
    expect(result.handled).toBe(true);
    expect(result.reason).toBe('timer_reset');
    expect(result.threadId).toBe(threadId);
  });

  it('should not handle message in untracked thread', () => {
    const message = createMockMessage({
      channelId: 'untracked-thread',
      channel: { id: 'untracked-thread', type: 11 }
    });
    
    const result = handleMessageCreate(message, tracker);
    
    expect(result.handled).toBe(false);
    expect(result.reason).toBe('not_tracked');
  });

  it('should handle message from real user in tracked thread', () => {
    const threadId = 'thread123';
    tracker.addThread(threadId, 'channel456');
    
    const user = createMockUser({ bot: false, tag: 'User#1234' });
    const message = createMockMessage({
      author: user,
      channelId: threadId,
      channel: { id: threadId, type: 11 }
    });
    
    const result = handleMessageCreate(message, tracker);
    
    expect(result.handled).toBe(true);
    expect(result.threadId).toBe(threadId);
  });
});

describe('formatThreadMessages', () => {
  it('should format a single message', () => {
    const message = createMockMessage({
      id: 'msg1',
      content: 'Hello world',
      author: createMockUser({ tag: 'User#1234' }),
      createdTimestamp: new Date('2026-01-01T12:00:00Z').getTime()
    });
    
    const messages = createMessageCollection([message]);
    const formatted = formatThreadMessages(messages);
    
    expect(formatted).toContain('2026-01-01T12:00:00.000Z');
    expect(formatted).toContain('msg1');
    expect(formatted).toContain('User#1234');
    expect(formatted).toContain('Hello world');
  });

  it('should format multiple messages', () => {
    const msg1 = createMockMessage({
      id: 'msg1',
      content: 'First message',
      author: createMockUser({ tag: 'User1#0001' })
    });
    
    const msg2 = createMockMessage({
      id: 'msg2',
      content: 'Second message',
      author: createMockUser({ tag: 'User2#0002' })
    });
    
    const messages = createMessageCollection([msg1, msg2]);
    const formatted = formatThreadMessages(messages);
    
    expect(formatted).toContain('First message');
    expect(formatted).toContain('Second message');
    expect(formatted).toContain('User1#0001');
    expect(formatted).toContain('User2#0002');
  });

  it('should include attachment information', () => {
    const attachment = createMockAttachment({
      contentType: 'image/png',
      url: 'https://example.com/image.png'
    });
    
    const attachments = new Map();
    attachments.set(attachment.id, attachment);
    
    const message = createMockMessage({
      content: 'Check this out',
      attachments
    });
    
    const messages = createMessageCollection([message]);
    const formatted = formatThreadMessages(messages);
    
    expect(formatted).toContain('Attachment/s:');
    expect(formatted).toContain('image/png');
    expect(formatted).toContain('https://example.com/image.png');
  });

  it('should handle empty message collection', () => {
    const messages = createMessageCollection([]);
    const formatted = formatThreadMessages(messages);
    
    expect(formatted).toBe('');
  });
});

describe('processThread', () => {
  let tracker;
  let mockClient;
  let allowedChannels;

  beforeEach(() => {
    tracker = new ThreadTracker();
    allowedChannels = {
      oxiOneBugs: 'allowed-channel-1',
      e16Bugs: 'allowed-channel-2'
    };
  });

  it('should process thread successfully', async () => {
    const threadId = 'thread123';
    const parentId = 'allowed-channel-1';
    
    const messages = createMessageCollection([
      createMockMessage({ content: 'Bug report here' })
    ]);
    
    const thread = createMockThread({
      id: threadId,
      parentId,
      messages: {
        fetch: jest.fn().mockResolvedValue(messages)
      }
    });
    
    const channels = new Map();
    channels.set(threadId, thread);
    
    mockClient = createMockClient({ channels });
    tracker.addThread(threadId, parentId);
    
    // Mock the processMessageCollection function
    const mockProcessMessageCollection = jest.fn().mockResolvedValue('AI response here');
    
    const result = await processThread(threadId, mockClient, allowedChannels, tracker, mockProcessMessageCollection);
    
    expect(result.success).toBe(true);
    expect(result.threadId).toBe(threadId);
    expect(result.channelName).toBe('parent-channel');
    expect(mockProcessMessageCollection).toHaveBeenCalled();
  });

  it('should fail if thread fetch fails', async () => {
    const threadId = 'nonexistent-thread';
    mockClient = createMockClient({ channels: new Map() });
    
    tracker.addThread(threadId, 'some-channel');
    
    const result = await processThread(threadId, mockClient, allowedChannels, tracker);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('fetch_failed');
    expect(tracker.threadsWaiting).toHaveLength(0); // Should be removed
  });

  it('should fail if channel is not allowed', async () => {
    const threadId = 'thread123';
    const parentId = 'not-allowed-channel';
    
    const thread = createMockThread({
      id: threadId,
      parentId
    });
    
    const channels = new Map();
    channels.set(threadId, thread);
    
    mockClient = createMockClient({ channels });
    tracker.addThread(threadId, parentId);
    
    const result = await processThread(threadId, mockClient, allowedChannels, tracker);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('channel_not_allowed');
  });

  it('should handle thread with no messages', async () => {
    const threadId = 'thread123';
    const parentId = 'allowed-channel-1';
    
    const emptyMessages = createMessageCollection([]);
    
    const thread = createMockThread({
      id: threadId,
      parentId,
      messages: {
        fetch: jest.fn().mockResolvedValue(emptyMessages)
      }
    });
    
    const channels = new Map();
    channels.set(threadId, thread);
    
    mockClient = createMockClient({ channels });
    tracker.addThread(threadId, parentId);
    
    const result = await processThread(threadId, mockClient, allowedChannels, tracker);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('no_messages');
    expect(tracker.trackedThreads).toHaveLength(0); // Should be removed from tracking
  });
});

describe('checkForTimeout', () => {
  let tracker;
  let mockClient;
  let allowedChannels;

  beforeEach(() => {
    tracker = new ThreadTracker();
    allowedChannels = {
      oxiOneBugs: 'allowed-channel-1'
    };
  });

  it('should return null if no threads are due', async () => {
    const recentTimestamp = Date.now() - (2 * 60 * 1000); // 2 minutes ago
    tracker.addThread('thread123', 'allowed-channel-1', recentTimestamp);
    
    mockClient = createMockClient();
    
    const result = await checkForTimeout(mockClient, allowedChannels, tracker);
    
    expect(result).toBeNull();
  });

  it('should process thread that has timed out', async () => {
    const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
    const threadId = 'thread123';
    const parentId = 'allowed-channel-1';
    
    tracker.addThread(threadId, parentId, oldTimestamp);
    
    const messages = createMessageCollection([
      createMockMessage({ content: 'Test message' })
    ]);
    
    const thread = createMockThread({
      id: threadId,
      parentId,
      messages: {
        fetch: jest.fn().mockResolvedValue(messages)
      }
    });
    
    const channels = new Map();
    channels.set(threadId, thread);
    
    mockClient = createMockClient({ channels });
    
    // Mock the processMessageCollection function
    const mockProcessMessageCollection = jest.fn().mockResolvedValue('AI response here');
    
    const result = await checkForTimeout(mockClient, allowedChannels, tracker, 5 * 60 * 1000, mockProcessMessageCollection);
    
    expect(result).not.toBeNull();
    expect(result.threadId).toBe(threadId);
  });

  it('should process oldest thread first when multiple are due', async () => {
    const now = Date.now();
    const oldest = now - (10 * 60 * 1000);
    const middle = now - (8 * 60 * 1000);
    
    tracker.addThread('thread1', 'allowed-channel-1', middle);
    tracker.addThread('thread2', 'allowed-channel-1', oldest);
    
    const thread = createMockThread({
      id: 'thread2',
      parentId: 'allowed-channel-1',
      messages: {
        fetch: jest.fn().mockResolvedValue(createMessageCollection([
          createMockMessage({ content: 'Test' })
        ]))
      }
    });
    
    const channels = new Map();
    channels.set('thread2', thread);
    
    mockClient = createMockClient({ channels });
    
    // Mock the processMessageCollection function
    const mockProcessMessageCollection = jest.fn().mockResolvedValue('AI response here');
    
    const result = await checkForTimeout(mockClient, allowedChannels, tracker, 5 * 60 * 1000, mockProcessMessageCollection);
    
    expect(result.threadId).toBe('thread2'); // oldest should be processed first
  });
});
