/**
 * Thread loader for converting JSON fixture data into test objects
 * that mimic Discord.js structures
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'threads.json');

/**
 * Load a Discord.js-like Collection (Map) from an array
 */
function createCollection(items, keyField = 'id') {
  const collection = new Map();
  items.forEach(item => {
    collection.set(item[keyField], item);
  });
  return collection;
}

/**
 * Convert a serialized attachment to a Discord.js-like attachment object
 */
function loadAttachment(data) {
  return {
    id: data.id,
    url: data.url,
    contentType: data.contentType,
    size: data.size,
    filename: data.filename
  };
}

/**
 * Convert a serialized user to a Discord.js-like user object
 */
function loadUser(data) {
  return {
    id: data.id,
    username: data.username,
    discriminator: data.discriminator,
    tag: data.tag,
    bot: data.bot
  };
}

/**
 * Convert a serialized message to a Discord.js-like message object
 */
function loadMessage(data, parentThread = null) {
  const attachments = createCollection(
    data.attachments.map(loadAttachment)
  );

  return {
    id: data.id,
    content: data.content,
    author: loadUser(data.author),
    channelId: data.channelId,
    createdTimestamp: data.createdTimestamp,
    attachments,
    channel: parentThread || {
      id: data.channelId,
      type: 11 // GUILD_PUBLIC_THREAD
    }
  };
}

/**
 * Convert a serialized thread to a Discord.js-like thread object
 */
function loadThread(data) {
  const messages = createCollection(
    data.messages.map(msg => loadMessage(msg))
  );

  const thread = {
    id: data.id,
    name: data.name,
    parentId: data.parentId,
    type: data.type,
    archived: data.archived,
    createdTimestamp: data.createdTimestamp,
    parent: data.parent ? {
      id: data.parent.id,
      name: data.parent.name
    } : null,
    messages: {
      fetch: async () => messages
    }
  };

  // Update message channel references to point to thread
  for (const message of messages.values()) {
    message.channel = thread;
  }

  return thread;
}

/**
 * Load threads from JSON fixture file
 * @param {string} fixturePath - Path to the JSON fixture file
 * @returns {Object} - Object containing metadata and loaded threads
 */
export function loadThreadsFromFixture(fixturePath = DEFAULT_FIXTURE_PATH) {
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture file not found: ${fixturePath}\n\nRun: node scripts/fetchThreads.js`);
  }

  const rawData = fs.readFileSync(fixturePath, 'utf8');
  const data = JSON.parse(rawData);

  const threads = data.threads.map(loadThread);

  return {
    fetchedAt: data.fetchedAt,
    channelId: data.channelId,
    channelName: data.channelName,
    threadCount: data.threadCount,
    threads,
    threadsCollection: createCollection(threads)
  };
}

/**
 * Get a specific thread by ID from the fixture
 * @param {string} threadId - The thread ID to find
 * @param {string} fixturePath - Path to the JSON fixture file
 * @returns {Object|null} - The thread object or null if not found
 */
export function getThreadById(threadId, fixturePath = DEFAULT_FIXTURE_PATH) {
  const { threads } = loadThreadsFromFixture(fixturePath);
  return threads.find(t => t.id === threadId) || null;
}

/**
 * Get all threads as an array from the fixture
 * @param {string} fixturePath - Path to the JSON fixture file
 * @returns {Array} - Array of thread objects
 */
export function getAllThreads(fixturePath = DEFAULT_FIXTURE_PATH) {
  const { threads } = loadThreadsFromFixture(fixturePath);
  return threads;
}

/**
 * Get a random thread from the fixture
 * @param {string} fixturePath - Path to the JSON fixture file
 * @returns {Object} - A random thread object
 */
export function getRandomThread(fixturePath = DEFAULT_FIXTURE_PATH) {
  const { threads } = loadThreadsFromFixture(fixturePath);
  if (threads.length === 0) {
    throw new Error('No threads available in fixture');
  }
  const randomIndex = Math.floor(Math.random() * threads.length);
  return threads[randomIndex];
}

/**
 * Get threads filtered by a predicate function
 * @param {Function} predicate - Function that returns true for threads to include
 * @param {string} fixturePath - Path to the JSON fixture file
 * @returns {Array} - Array of filtered thread objects
 */
export function getThreadsBy(predicate, fixturePath = DEFAULT_FIXTURE_PATH) {
  const { threads } = loadThreadsFromFixture(fixturePath);
  return threads.filter(predicate);
}
