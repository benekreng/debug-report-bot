import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  ThreadTracker,
  formatThreadMessages,
  processThread
} from '../lib/messageHandler.js';
import { createMockClient } from './factories/discord.js';
import { 
  loadThreadsFromFixture,
  getRandomThread,
  getAllThreads 
} from './loaders/threadLoader.js';

/**
 * Integration tests using real Discord thread data
 * 
 * These tests use fixture data generated from actual Discord threads.
 * To generate the fixture:
 *   node scripts/fetchThreads.js
 */

describe('Integration Tests with Real Thread Data', () => {
  let tracker;
  let allowedChannels;

  beforeEach(() => {
    tracker = new ThreadTracker();
    allowedChannels = {
      // This should match your actual channel IDs from config
      oxiOneBugs: 'your-channel-id-here'
    };
  });

  describe('formatThreadMessages with real data', () => {
    it('should format messages from a real thread', async () => {
      // Load real thread data
      const thread = getRandomThread();
      
      // Fetch messages (using the mock fetch that returns the fixture data)
      const messages = await thread.messages.fetch();
      
      // Format the messages
      const formatted = formatThreadMessages(messages);
      
      // Basic assertions
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      
      // Should contain thread name or message content
      if (messages.size > 0) {
        const firstMessage = Array.from(messages.values())[0];
        expect(formatted).toContain(firstMessage.author.tag);
      }
      
      console.log('Formatted thread:', thread.name);
      console.log('Message count:', messages.size);
    });

    it('should handle threads with attachments', async () => {
      const allThreads = getAllThreads();
      
      // Find a thread with attachments
      const threadWithAttachments = allThreads.find(t => {
        return t.messages.values && Array.from(t.messages.values || []).some(m => 
          m.attachments && m.attachments.size > 0
        );
      });

      if (!threadWithAttachments) {
        console.log('No threads with attachments found in fixture');
        return;
      }

      const messages = await threadWithAttachments.messages.fetch();
      const formatted = formatThreadMessages(messages);

      expect(formatted).toContain('Attachment/s:');
    });
  });

  describe('processThread with real data', () => {
    it('should process a real thread successfully', async () => {
      const thread = getRandomThread();
      const threadId = thread.id;
      const parentId = thread.parentId;

      // Set up mock client that returns our fixture thread
      const channels = new Map();
      channels.set(threadId, thread);
      const mockClient = createMockClient({ channels });

      tracker.addThread(threadId, parentId);

      // Mock the AI processing function
      const mockProcessMessageCollection = jest.fn().mockResolvedValue('Mock AI response');

      const result = await processThread(
        threadId, 
        mockClient, 
        { [parentId]: parentId }, // Allow this channel
        tracker, 
        mockProcessMessageCollection
      );

      expect(result.success).toBe(true);
      expect(result.threadId).toBe(threadId);
      expect(mockProcessMessageCollection).toHaveBeenCalled();

      // Verify the formatted message structure
      const callArg = mockProcessMessageCollection.mock.calls[0][0];
      expect(typeof callArg).toBe('string');
      
      console.log('Processed real thread:', thread.name);
      console.log('Message count:', thread.messages.values ? Array.from(thread.messages.values()).length : 0);
    });

    it('should process multiple real threads', async () => {
      const allThreads = getAllThreads();
      const threadsToTest = allThreads.slice(0, 3); // Test first 3 threads

      const mockProcessMessageCollection = jest.fn().mockResolvedValue('Mock AI response');

      for (const thread of threadsToTest) {
        const channels = new Map();
        channels.set(thread.id, thread);
        const mockClient = createMockClient({ channels });

        tracker.addThread(thread.id, thread.parentId);

        const result = await processThread(
          thread.id,
          mockClient,
          { [thread.parentId]: thread.parentId },
          tracker,
          mockProcessMessageCollection
        );

        expect(result.success).toBe(true);
        console.log(`Processed: ${thread.name} (${result.channelName})`);
      }

      expect(mockProcessMessageCollection).toHaveBeenCalledTimes(threadsToTest.length);
    });
  });

  describe('Fixture metadata', () => {
    it('should have valid fixture metadata', () => {
      const fixture = loadThreadsFromFixture();

      expect(fixture.fetchedAt).toBeDefined();
      expect(fixture.channelId).toBeDefined();
      expect(fixture.channelName).toBeDefined();
      expect(fixture.threadCount).toBeGreaterThan(0);
      expect(fixture.threads).toHaveLength(fixture.threadCount);

      console.log('Fixture info:');
      console.log(`  Fetched: ${fixture.fetchedAt}`);
      console.log(`  Channel: ${fixture.channelName}`);
      console.log(`  Threads: ${fixture.threadCount}`);
    });
  });
});
