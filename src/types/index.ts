import { ChatInputCommandInteraction } from 'discord.js';

export interface Track {
  title: string;
  url: string;
  duration: number; // in seconds
  thumbnail: string;
  requester: string; // user.tag
  requesterId: string;
}

export type LoopMode = 'off' | 'track' | 'queue';

export interface Command {
  /** Slash command definition — any discord.js builder variant */
  data: { name: string; toJSON(): object };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
