import { Client, Collection, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Command } from './types/index';

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

// Events
import * as readyEvent from './events/ready';
import * as interactionCreateEvent from './events/interactionCreate';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error('[Bot] DISCORD_TOKEN is not set in environment variables.');
  process.exit(1);
}

// Build command collection
const commands = new Collection<string, Command>();
const commandModules: Command[] = [
  play, pause, resume, skip, stop, queue,
  nowplaying, volume, loop, shuffle, remove, clear, ping,
];
for (const mod of commandModules) {
  commands.set(mod.data.name, mod);
}

// Create client — only needs Guilds + GuildVoiceStates
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// Register events
client.once(readyEvent.name, (c) => readyEvent.execute(c as Client));
client.on(interactionCreateEvent.name, (interaction) =>
  void interactionCreateEvent.execute(interaction, commands),
);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Bot] SIGTERM received — shutting down gracefully.');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[Bot] SIGINT received — shutting down gracefully.');
  client.destroy();
  process.exit(0);
});

// Start
client.login(TOKEN);
