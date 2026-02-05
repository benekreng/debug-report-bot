/**
 * Non-secret config: channel IDs, thread IDs, etc.
 * Copy to config.json and fill in your values (config.json is gitignored).
 * Or set env vars and read them here for per-environment IDs.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, 'config.json');
let config = {};

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

/** Known channel/thread IDs by purpose (override via config.json or env) */
export const Channels = {
  OXI_ONE_BUGS: 'OXI_ONE_BUGS',
  E16_BUGS: 'E16_BUGS',
};

export const channels = {
  OXI_ONE_BUGS: config.oxiOneBugsChannelId,
  E16_BUGS: config.e16BugsChannelId,
};

/** Reverse mapping for O(1) lookups: Discord ID -> Enum value */
export const channelIdToEnum = Object.fromEntries(
  Object.entries(channels).map(([enumVal, id]) => [id, enumVal])
);

// Clean up undefined channels
Object.keys(channels).forEach(key => {
  if (!channels[key]) {
    let channelName = key;
    delete channels[key];
    // throw new Error(`Channel ${channelName} is not set in config.json`);
  }
});

/** Thread IDs you collect or care about (e.g. for routing or filtering) */
export const threadIds = {
  // Add keys as needed; can be filled from config.json or at runtime
};
