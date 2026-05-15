import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/MusicPlayer';
import { createErrorEmbed, createQueueEmbed } from '../utils/embeds';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Show the current music queue')
  .addIntegerOption((opt) =>
    opt
      .setName('page')
      .setDescription('Page number (default: 1)')
      .setMinValue(1)
      .setRequired(false),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const player = musicManager.get(interaction.guildId!);
  if (!player || player.queue.size === 0) {
    await interaction.reply({ embeds: [createErrorEmbed('The queue is empty.')] });
    return;
  }

  const page = interaction.options.getInteger('page') ?? 1;
  await interaction.reply({ embeds: [createQueueEmbed(player.queue, page)] });
}
