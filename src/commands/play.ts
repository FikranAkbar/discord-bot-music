import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { musicManager } from '../music/MusicPlayer';
import { searchTrack } from '../music/AudioStream';
import { createErrorEmbed, createNowPlayingEmbed, createSuccessEmbed } from '../utils/embeds';
import { isInVoiceChannel, isInSameVoiceChannel } from '../utils/validators';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song from YouTube URL or keyword search')
  .addStringOption((opt) =>
    opt
      .setName('query')
      .setDescription('YouTube URL or search keyword')
      .setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const member = interaction.member as GuildMember;

  if (!isInVoiceChannel(member)) {
    await interaction.editReply({ embeds: [createErrorEmbed('You must be in a voice channel to use this command.')] });
    return;
  }

  const botMember = interaction.guild!.members.me!;
  if (!isInSameVoiceChannel(member, botMember)) {
    await interaction.editReply({ embeds: [createErrorEmbed('You must be in the same voice channel as the bot.')] });
    return;
  }

  const query = interaction.options.getString('query', true).trim();
  const player = musicManager.getOrCreate(interaction.guildId!);

  // Connect to voice channel if needed
  if (!player.isConnected) {
    try {
      await player.connect(member.voice.channel!);
    } catch (err) {
      await interaction.editReply({ embeds: [createErrorEmbed('Could not join your voice channel. Check bot permissions.')] });
      return;
    }
  }

  await interaction.editReply({ embeds: [createSuccessEmbed(`Searching for **${query}**...`)] });

  const track = await searchTrack(query, member);
  if (!track) {
    await interaction.editReply({ embeds: [createErrorEmbed('No results found. Try a different query or URL.')] });
    return;
  }

  await player.enqueue(track);

  if (player.queue.size === 1) {
    // Playing immediately
    await interaction.editReply({ embeds: [createNowPlayingEmbed(track, player.queue)] });
  } else {
    const pos = player.queue.upcomingCount;
    await interaction.editReply({
      embeds: [
        createSuccessEmbed(`Added **[${track.title}](${track.url})** to the queue at position **#${pos}**.`),
      ],
    });
  }
}
