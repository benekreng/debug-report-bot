#!/usr/bin/env node
/**
 * Script to fetch real Discord threads and save them as JSON fixtures for testing
 * 
 * Usage:
 *   node scripts/fetchThreads.js [channelId] [numThreads]
 * 
 * Examples:
 *   node scripts/fetchThreads.js                    # Fetch 20 threads from OXI_ONE_BUGS
 *   node scripts/fetchThreads.js 123456789 10       # Fetch 10 threads from specific channel
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { channels } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '__tests__', 'fixtures');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'threads.json');

// Parse command line arguments
const args = process.argv.slice(2);
const targetChannelId = args[0] || channels.OXI_ONE_BUGS;
const numThreads = parseInt(args[1]) || 20;

console.log(`Fetching ${numThreads} threads from channel ${targetChannelId}...`);

/**
 * Serialize a Discord message to a plain object
 */
function serializeMessage(message) {
  const attachments = [];
  if (message.attachments && message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      attachments.push({
        id: attachment.id,
        url: attachment.url,
        contentType: attachment.contentType,
        size: attachment.size,
        filename: attachment.filename
      });
    }
  }

  return {
    id: message.id,
    content: message.content,
    author: {
      id: message.author.id,
      username: message.author.username,
      discriminator: message.author.discriminator,
      tag: message.author.tag,
      bot: message.author.bot
    },
    channelId: message.channelId,
    createdTimestamp: message.createdTimestamp,
    attachments
  };
}

/**
 * Serialize a Discord thread to a plain object
 */
async function serializeThread(thread) {
  // Fetch messages from the thread (up to 100)
  const messagesCollection = await thread.messages.fetch({ limit: 100 });
  const messages = [];
  
  for (const message of messagesCollection.values()) {
    messages.push(serializeMessage(message));
  }

  // Sort messages by timestamp (oldest first)
  messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  return {
    id: thread.id,
    name: thread.name,
    parentId: thread.parentId,
    type: thread.type,
    archived: thread.archived,
    createdTimestamp: thread.createdTimestamp,
    parent: thread.parent ? {
      id: thread.parent.id,
      name: thread.parent.name
    } : null,
    messages
  };
}

/**
 * Fetch threads from a channel
 */
async function fetchThreads(client, channelId, limit = 20) {
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    console.log(`Found channel: ${channel.name}`);

    // Fetch active threads
    const activeThreads = await channel.threads.fetchActive();
    console.log(`Found ${activeThreads.threads.size} active threads`);

    // Fetch archived threads
    const archivedThreads = await channel.threads.fetchArchived({ limit: limit * 2 });
    console.log(`Found ${archivedThreads.threads.size} archived threads`);

    // Combine threads
    const allThreads = new Map([
      ...activeThreads.threads,
      ...archivedThreads.threads
    ]);

    console.log(`Total threads found: ${allThreads.size}`);

    // Take only the requested number of threads
    const threadsToSerialize = Array.from(allThreads.values()).slice(0, limit);
    
    console.log(`Serializing ${threadsToSerialize.length} threads...`);

    const serializedThreads = [];
    let count = 0;
    
    for (const thread of threadsToSerialize) {
      count++;
      console.log(`[${count}/${threadsToSerialize.length}] Processing thread: ${thread.name}`);
      
      try {
        const serialized = await serializeThread(thread);
        serializedThreads.push(serialized);
      } catch (error) {
        console.error(`Failed to serialize thread ${thread.id}:`, error.message);
      }
    }

    return {
      fetchedAt: new Date().toISOString(),
      channelId,
      channelName: channel.name,
      threadCount: serializedThreads.length,
      threads: serializedThreads
    };
  } catch (error) {
    console.error('Error fetching threads:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
      const data = await fetchThreads(client, targetChannelId, numThreads);

      // Ensure output directory exists
      if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      }

      // Write to file
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
      console.log(`\n✅ Successfully saved ${data.threadCount} threads to ${OUTPUT_FILE}`);
      console.log(`   Channel: ${data.channelName}`);
      console.log(`   Fetched at: ${data.fetchedAt}`);

    } catch (error) {
      console.error('❌ Failed to fetch threads:', error);
      process.exit(1);
    } finally {
      client.destroy();
      process.exit(0);
    }
  });

  await client.login(process.env.BOT_TOKEN);
}

main();
