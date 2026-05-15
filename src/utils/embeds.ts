import { EmbedBuilder } from 'discord.js';
import { Track, LoopMode } from '../types/index';
import { MusicQueue } from '../music/MusicQueue';

const COLORS = {
  primary: 0x5865f2, // Discord blurple
  success: 0x57f287,
  error: 0xed4245,
  warning: 0xfee75c,
  info: 0x5865f2,
} as const;

/** Format seconds into m:ss or h:mm:ss */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'LIVE';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function createNowPlayingEmbed(track: Track, queue: MusicQueue): EmbedBuilder {
  const loopLabel: Record<LoopMode, string> = {
    off: '❌ Off',
    track: '🔂 Track',
    queue: '🔁 Queue',
  };

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🎵 Now Playing')
    .setDescription(`**[${track.title}](${track.url})**`)
    .setThumbnail(track.thumbnail || null)
    .addFields(
      { name: 'Duration', value: formatDuration(track.duration), inline: true },
      { name: 'Loop', value: loopLabel[queue.loopMode], inline: true },
      { name: 'Volume', value: `${Math.round(queue.volume * 100)}%`, inline: true },
      { name: 'Requested by', value: `<@${track.requesterId}>`, inline: true },
      { name: 'In Queue', value: `${Math.max(0, queue.tracks.length - 1)} more`, inline: true },
    )
    .setTimestamp();
}

export function createQueueEmbed(queue: MusicQueue, page = 1): EmbedBuilder {
  const ITEMS_PER_PAGE = 10;
  const tracks = queue.tracks;
  const totalPages = Math.max(1, Math.ceil((tracks.length - 1) / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const current = tracks[0];
  const upcoming = tracks.slice(1);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const pageItems = upcoming.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('📋 Queue')
    .setTimestamp();

  if (!current) {
    embed.setDescription('The queue is empty.');
    return embed;
  }

  embed.addFields({
    name: '▶️ Now Playing',
    value: `**[${current.title}](${current.url})** — ${formatDuration(current.duration)} | <@${current.requesterId}>`,
  });

  if (pageItems.length > 0) {
    const list = pageItems
      .map(
        (t, i) =>
          `\`${startIdx + i + 1}.\` **[${t.title}](${t.url})** — ${formatDuration(t.duration)} | <@${t.requesterId}>`,
      )
      .join('\n');

    embed.addFields({ name: `📜 Up Next (Page ${safePage}/${totalPages})`, value: list });
  }

  const totalDuration = tracks.reduce((acc, t) => acc + t.duration, 0);
  embed.setFooter({
    text: `${tracks.length} track${tracks.length !== 1 ? 's' : ''} | Total: ${formatDuration(totalDuration)} | Page ${safePage}/${totalPages}`,
  });

  return embed;
}

export function createErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle('❌ Error')
    .setDescription(message)
    .setTimestamp();
}

export function createSuccessEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setDescription(`✅ ${message}`)
    .setTimestamp();
}

export function createInfoEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(title)
    .setDescription(message)
    .setTimestamp();
}
