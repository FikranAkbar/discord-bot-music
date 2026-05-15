import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/MusicPlayer';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds';
import { isInVoiceChannel, isInSameVoiceChannel } from '../utils/validators';

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Clear all upcoming tracks from the queue (keeps current song)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;

  if (!isInVoiceChannel(member)) {
    await interaction.reply({ embeds: [createErrorEmbed('You must be in a voice channel.')], ephemeral: true });
    return;
  }

  const botMember = interaction.guild!.members.me!;
  if (!isInSameVoiceChannel(member, botMember)) {
    await interaction.reply({ embeds: [createErrorEmbed('You must be in the same voice channel as the bot.')], ephemeral: true });
    return;
  }

  const player = musicManager.get(interaction.guildId!);
  if (!player || player.queue.upcomingCount === 0) {
    await interaction.reply({ embeds: [createErrorEmbed('There are no upcoming tracks to clear.')] });
    return;
  }

  const count = player.queue.upcomingCount;
  // Remove all tracks except the current one (index 0)
  player.queue.tracks.splice(1);

  await interaction.reply({ embeds: [createSuccessEmbed(`Cleared **${count}** upcoming track(s) from the queue.`)] });
}
