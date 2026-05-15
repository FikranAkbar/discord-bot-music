import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/MusicPlayer';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds';
import { isInVoiceChannel, isInSameVoiceChannel } from '../utils/validators';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pause the currently playing song');

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
  if (!player || !player.isPlaying) {
    await interaction.reply({ embeds: [createErrorEmbed('Nothing is currently playing.')], ephemeral: true });
    return;
  }

  const paused = player.pause();
  if (paused) {
    await interaction.reply({ embeds: [createSuccessEmbed('Playback paused.')] });
  } else {
    await interaction.reply({ embeds: [createErrorEmbed('Could not pause playback.')] });
  }
}
