import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/MusicPlayer';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds';
import { isInVoiceChannel, isInSameVoiceChannel } from '../utils/validators';
import { LoopMode } from '../types/index';

const LOOP_LABELS: Record<LoopMode, string> = {
  off: '❌ Off',
  track: '🔂 Track',
  queue: '🔁 Queue',
};

export const data = new SlashCommandBuilder()
  .setName('loop')
  .setDescription('Set the loop mode')
  .addStringOption((opt) =>
    opt
      .setName('mode')
      .setDescription('Loop mode to set')
      .setRequired(true)
      .addChoices(
        { name: 'Off', value: 'off' },
        { name: 'Track (repeat current song)', value: 'track' },
        { name: 'Queue (repeat all)', value: 'queue' },
      ),
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

  const mode = interaction.options.getString('mode', true) as LoopMode;
  player.queue.loopMode = mode;

  await interaction.reply({ embeds: [createSuccessEmbed(`Loop mode set to **${LOOP_LABELS[mode]}**.`)] });
}
