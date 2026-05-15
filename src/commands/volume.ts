import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/MusicPlayer';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds';
import { isInVoiceChannel, isInSameVoiceChannel } from '../utils/validators';

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Set the playback volume (0–100)')
  .addIntegerOption((opt) =>
    opt
      .setName('level')
      .setDescription('Volume level from 0 to 100')
      .setMinValue(0)
      .setMaxValue(100)
      .setRequired(true),
  );

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
  if (!player) {
    await interaction.reply({ embeds: [createErrorEmbed('Nothing is currently playing.')], ephemeral: true });
    return;
  }

  const level = interaction.options.getInteger('level', true);
  player.setVolume(level / 100);

  await interaction.reply({ embeds: [createSuccessEmbed(`Volume set to **${level}%**.`)] });
}
