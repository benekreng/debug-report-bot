/**
 * Message handling logic extracted for testability
 */
import { processMessageCollection } from '../langchain/agent.js';

/**
 * State management for thread tracking
 */
export class ThreadTracker {
  constructor() {
    this.threadIdsToProcess = [];
    this.trackedThreads = [];
  }

  addThread(threadId, channelId, timestamp = Date.now()) {
    this.threadIdsToProcess.push({ timestamp, threadId, channelId });
    this.trackedThreads.push({ timestamp, threadId, channelId });
  }

  findThreadToProcess(threadId) {
    return this.threadIdsToProcess.findIndex(thread => thread.threadId === threadId);
  }

  updateThreadTimestamp(threadId, timestamp = Date.now()) {
    const foundIdx = this.findThreadToProcess(threadId);
    if (foundIdx !== -1) {
      this.threadIdsToProcess[foundIdx].timestamp = timestamp;
      return true;
    }
    return false;
  }

  removeThreadFromProcessing(threadId) {
    const idx = this.findThreadToProcess(threadId);
    if (idx !== -1) {
      this.threadIdsToProcess.splice(idx, 1);
    }
  }

  removeThreadFromTracking(threadId) {
    const trackedIdx = this.trackedThreads.findIndex(thread => thread.threadId === threadId);
    if (trackedIdx !== -1) {
      this.trackedThreads.splice(trackedIdx, 1);
    }
  }

  getThreadsDueForProcessing(timeout = 5 * 60 * 1000) {
    const now = Date.now();
    this.threadIdsToProcess.sort((a, b) => a.timestamp - b.timestamp);
    
    const dueThreads = this.threadIdsToProcess.filter(
      thread => now - thread.timestamp > timeout
    );
    
    return dueThreads;
  }
}

/**
 * Handle message creation event
 * Returns true if message was handled (timer reset), false otherwise
 */
export function handleMessageCreate(message, threadTracker) {
  // Ignore bot messages
  if (message.author.bot) {
    return { handled: false, reason: 'bot_message' };
  }

  // Check if the message is in a thread we're tracking
  const foundIdx = threadTracker.findThreadToProcess(message.channel.id);
  
  if (foundIdx !== -1) {
    // Reset timer for this thread
    threadTracker.updateThreadTimestamp(message.channel.id);
    return { handled: true, reason: 'timer_reset', threadId: message.channel.id };
  }

  // Message not in a tracked thread
  return { handled: false, reason: 'not_tracked' };
}

/**
 * Format messages from a thread for processing
 */
export function formatThreadMessages(messages) {
  let threadMessages = '';
  
  for (const message of messages.values()) {
    const timestampIso = new Date(message.createdTimestamp).toISOString();
    threadMessages += `${timestampIso}; ${message.id}; ${message.author.tag}; ${message.content} `;
    
    if (message.attachments.size > 0) {
      threadMessages += `Attachment/s: `;
      for (const attachment of message.attachments.values()) {
        threadMessages += `${attachment.contentType}; ${attachment.url}`;
      }
    }
    threadMessages += `\n`;
  }
  
  return threadMessages;
}

/**
 * Process a thread - fetch messages and send to LangChain
 * @param {function} processMessageFn - Optional function to process messages (for testing)
 */
export async function processThread(threadId, client, allowedChannels, threadTracker, processMessageFn = null) {
  // Use injected function or default to real implementation
  const processFn = processMessageFn || processMessageCollection;
  let thread;
  try {
    thread = await client.channels.fetch(threadId);
  } catch (error) {
    console.error(`Failed to fetch thread ${threadId}:`, error.message);
    threadTracker.removeThreadFromProcessing(threadId);
    return { success: false, error: 'fetch_failed' };
  }

  const channelId = thread.parentId;
  
  // Check if channelId is in allowed channels
  if (!Object.values(allowedChannels).includes(channelId)) {
    threadTracker.removeThreadFromProcessing(threadId);
    return { success: false, error: 'channel_not_allowed' };
  }

  const options = { limit: 100 };
  let messages;
  
  try {
    messages = await thread.messages.fetch(options);
  } catch (error) {
    console.error(`Failed to fetch messages for thread ${threadId}:`, error.message);
    threadTracker.removeThreadFromProcessing(threadId);
    return { success: false, error: 'messages_fetch_failed' };
  }

  // If there are no messages, remove from tracking
  if (messages.size === 0) {
    threadTracker.removeThreadFromTracking(threadId);
    console.log(`Thread ${threadId} has no messages, removing from tracked threads`);
    return { success: false, error: 'no_messages' };
  }

  const formattedMessages = formatThreadMessages(messages);
  
  let response;
  try {
    response = await processFn(formattedMessages);
  } catch (error) {
    console.error(`Failed to process messages for thread ${threadId}:`, error.message);
    return { success: false, error: 'processing_failed' };
  }

  console.log(`Processed thread ${threadId} of channel ${thread.parent.name}`);
  console.log(response);

  // Remove from processing queue after successful processing
  threadTracker.removeThreadFromProcessing(threadId);

  return { 
    success: true, 
    threadId, 
    channelName: thread.parent.name,
    response 
  };
}

/**
 * Check for threads that have timed out and should be processed
 * @param {function} processMessageFn - Optional function to process messages (for testing)
 */
export async function checkForTimeout(client, allowedChannels, threadTracker, timeout = 5 * 60 * 1000, processMessageFn = null) {
  const dueThreads = threadTracker.getThreadsDueForProcessing(timeout);
  
  if (dueThreads.length > 0) {
    const threadToProcess = dueThreads[0];
    threadTracker.removeThreadFromProcessing(threadToProcess.threadId);
    return await processThread(threadToProcess.threadId, client, allowedChannels, threadTracker, processMessageFn);
  }
  
  return null;
}
