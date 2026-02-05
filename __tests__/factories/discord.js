/**
 * Discord object factories for testing
 * These create fake Discord objects that mirror the structure we use from discord.js
 */

/**
 * Create a fake Discord user
 */
export function createMockUser({ 
  id = '123456789',
  username = 'testuser',
  discriminator = '0001',
  tag = 'testuser#0001',
  bot = false 
} = {}) {
  return {
    id,
    username,
    discriminator,
    tag,
    bot,
  };
}

/**
 * Create a fake Discord attachment
 */
export function createMockAttachment({
  id = '987654321',
  url = 'https://cdn.discordapp.com/attachments/123/456/file.png',
  contentType = 'image/png',
  size = 1024,
  filename = 'file.png'
} = {}) {
  return {
    id,
    url,
    contentType,
    size,
    filename,
  };
}

/**
 * Create a fake Discord message
 */
export function createMockMessage({
  id = '111111111',
  content = 'Test message',
  author = createMockUser(),
  channelId = '222222222',
  createdTimestamp = Date.now(),
  attachments = new Map(),
  channel = null
} = {}) {
  return {
    id,
    content,
    author,
    channelId,
    createdTimestamp,
    attachments,
    channel: channel || {
      id: channelId,
      type: 11, // GUILD_PUBLIC_THREAD
    }
  };
}

/**
 * Create a fake Discord thread channel
 */
export function createMockThread({
  id = '333333333',
  name = 'Test Thread',
  parentId = '444444444',
  type = 11, // GUILD_PUBLIC_THREAD
  messages = null
} = {}) {
  const thread = {
    id,
    name,
    parentId,
    type,
    parent: {
      id: parentId,
      name: 'parent-channel',
    },
    messages: messages || {
      fetch: async () => new Map(),
    }
  };
  
  return thread;
}

/**
 * Create a fake Discord client
 */
export function createMockClient({
  userId = '999999999',
  userTag = 'TestBot#0000',
  channels = new Map()
} = {}) {
  return {
    user: {
      id: userId,
      tag: userTag,
    },
    channels: {
      fetch: async (channelId) => {
        if (channels.has(channelId)) {
          return channels.get(channelId);
        }
        throw new Error(`Channel ${channelId} not found`);
      }
    }
  };
}

/**
 * Create a collection of messages (mimics Discord.js Collection/Map)
 */
export function createMessageCollection(messages = []) {
  const collection = new Map();
  messages.forEach(msg => {
    collection.set(msg.id, msg);
  });
  // Note: Map.size is a getter, automatically calculated
  return collection;
}
