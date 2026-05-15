import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Commands
import * as play from './commands/play';
import * as pause from './commands/pause';
import * as resume from './commands/resume';
import * as skip from './commands/skip';
import * as stop from './commands/stop';
import * as queue from './commands/queue';
import * as nowplaying from './commands/nowplaying';
import * as volume from './commands/volume';
import * as loop from './commands/loop';
import * as shuffle from './commands/shuffle';
import * as remove from './commands/remove';
import * as clear from './commands/clear';
import * as ping from './commands/ping';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // Optional: register to specific guild during dev

if (!TOKEN || !CLIENT_ID) {
  console.error('[Deploy] DISCORD_TOKEN and DISCORD_CLIENT_ID must be set.');
  process.exit(1);
}

const commands = [
  play, pause, resume, skip, stop, queue,
  nowplaying, volume, loop, shuffle, remove, clear, ping,
].map((mod) => mod.data.toJSON());

const rest = new REST().setToken(TOKEN);

(async () => {
  try {
    console.log(`[Deploy] Registering ${commands.length} slash command(s)...`);

    if (GUILD_ID) {
      // Guild-specific (instant update, good for development)
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`[Deploy] Successfully registered commands to guild ${GUILD_ID}.`);
    } else {
      // Global (can take up to 1 hour to propagate)
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('[Deploy] Successfully registered global commands (may take up to 1 hour to propagate).');
    }
  } catch (err) {
    console.error('[Deploy] Error registering commands:', err);
    process.exit(1);
  }
})();
