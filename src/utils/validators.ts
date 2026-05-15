import { GuildMember } from 'discord.js';

/** Check if the member is currently in a voice channel */
export function isInVoiceChannel(member: GuildMember): boolean {
  return member.voice.channel !== null;
}

/**
 * Check if the member is in the same voice channel as the bot.
 * Returns true if the bot is not in any channel yet (allows joining).
 */
export function isInSameVoiceChannel(
  member: GuildMember,
  botMember: GuildMember,
): boolean {
  if (!botMember.voice.channel) return true; // bot not in a channel yet
  return member.voice.channelId === botMember.voice.channelId;
}

/** Check if volume value is within valid range 0–100 */
export function isValidVolume(volume: number): boolean {
  return Number.isInteger(volume) && volume >= 0 && volume <= 100;
}

/** Check if queue position is valid (1-indexed) */
export function isValidPosition(position: number, queueLength: number): boolean {
  return Number.isInteger(position) && position >= 1 && position <= queueLength;
}
