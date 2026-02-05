import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { channels } from './config.js';
import {
  ThreadTracker,
  handleMessageCreate,
  checkForTimeout as checkForTimeoutHandler,
  processThread as processThreadHandler
} from './lib/messageHandler.js';

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize thread tracker
const threadTracker = new ThreadTracker();

// Timeout configuration (5 minutes)
const TIMEOUT_MS = 5 * 60 * 1000;

// Bot ready event
client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);
  setInterval(() => {
    checkForTimeoutHandler(client, channels, threadTracker, TIMEOUT_MS);
  }, 1000);
});

client.on('threadCreate', (thread) => {
  threadTracker.addThread(thread.id, thread.parentId);
  console.log(`Thread created: ${thread.id}`);
});

client.on('messageCreate', async (message) => {
  const result = handleMessageCreate(message, threadTracker);
  
  if (result.handled) {
    console.log(`Timer reset for thread ${result.threadId}`);
  } else if (result.reason === 'not_tracked') {
    console.log(`Message from ${message.author.tag}: ${message.content}`);
    // TODO: Send parsed data to your API
    // Example:
    // const data = parseMessage(message);
    // await fetch('YOUR_API_URL', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
  }
});

// Login to Discord
client.login(process.env.BOT_TOKEN);
