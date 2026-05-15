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

  let track: Awaited<ReturnType<typeof searchTrack>>;
  try {
    track = await searchTrack(query, member);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[play command] searchTrack error:', err);
    await interaction.editReply({ embeds: [createErrorEmbed(`Search failed: \`${msg}\``)] });
    return;
  }
  if (!track) {
    await interaction.editReply({ embeds: [createErrorEmbed('No results found. Try a different query or URL.')] });
    return;
  }

  await player.enqueue(track).catch(async (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[play command] enqueue error:', err);
    await interaction.editReply({
      embeds: [createErrorEmbed(`Failed to start playback: \`${msg}\``)],
    });
    return null;
  });

  // If enqueue threw, the track was removed from queue — stop here
  if (player.queue.size === 0) return;

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
