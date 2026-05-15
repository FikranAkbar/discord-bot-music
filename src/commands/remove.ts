import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/MusicPlayer';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds';
import { isInVoiceChannel, isInSameVoiceChannel } from '../utils/validators';

export const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a specific track from the queue by its position')
  .addIntegerOption((opt) =>
    opt
      .setName('position')
      .setDescription('Position in the queue (1 = now playing)')
      .setMinValue(1)
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
  if (!player || player.queue.size === 0) {
    await interaction.reply({ embeds: [createErrorEmbed('The queue is empty.')], ephemeral: true });
    return;
  }

  const position = interaction.options.getInteger('position', true);

  if (position > player.queue.size) {
    await interaction.reply({
      embeds: [createErrorEmbed(`Position out of range. Queue has **${player.queue.size}** track(s).`)],
      ephemeral: true,
    });
    return;
  }

  const removed = player.queue.remove(position);
  if (!removed) {
    await interaction.reply({ embeds: [createErrorEmbed('Could not remove the track.')], ephemeral: true });
    return;
  }

  // If we removed the currently playing track (position 1), skip to next
  if (position === 1) {
    await player.skip();
    await interaction.reply({ embeds: [createSuccessEmbed(`Removed and skipped **${removed.title}**.`)] });
  } else {
    await interaction.reply({ embeds: [createSuccessEmbed(`Removed **${removed.title}** from position **#${position}**.`)] });
  }
}
