import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/MusicPlayer';
import { createErrorEmbed, createNowPlayingEmbed } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Show info about the currently playing song');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = musicManager.get(interaction.guildId!);
  const current = player?.queue.current();

  if (!player || !current || (!player.isPlaying && !player.isPaused)) {
    await interaction.reply({ embeds: [createErrorEmbed('Nothing is currently playing.')] });
    return;
  }

  await interaction.reply({ embeds: [createNowPlayingEmbed(current, player.queue)] });
}
