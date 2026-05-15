import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/MusicPlayer';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds';
import { isInVoiceChannel, isInSameVoiceChannel } from '../utils/validators';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume the paused song');

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
  if (!player || !player.isPaused) {
    await interaction.reply({ embeds: [createErrorEmbed('Playback is not paused.')], ephemeral: true });
    return;
  }

  const resumed = player.resume();
  if (resumed) {
    await interaction.reply({ embeds: [createSuccessEmbed('Playback resumed.')] });
  } else {
    await interaction.reply({ embeds: [createErrorEmbed('Could not resume playback.')] });
  }
}
