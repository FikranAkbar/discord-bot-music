import { Client, Events } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client): void {
  console.log(`[Bot] Logged in as ${client.user!.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);
  client.user!.setActivity('🎵 /play');
}
