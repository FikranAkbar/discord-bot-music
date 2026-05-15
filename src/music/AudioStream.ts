import { spawn } from 'child_process';
import { Readable } from 'stream';
import { createAudioResource, StreamType } from '@discordjs/voice';
import { Innertube } from 'youtubei.js';
import { Track } from '../types/index';
import { GuildMember } from 'discord.js';

const YOUTUBE_URL_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/).+/;

// Singleton for search — does not need player script, much faster to init
let _searchClient: Awaited<ReturnType<typeof Innertube.create>> | null = null;

async function getSearchClient() {
  if (!_searchClient) {
    _searchClient = await Innertube.create({ retrieve_player: false });
  }
  return _searchClient;
}

function extractVideoId(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
  if (!m) throw new Error('Could not extract video ID from URL');
  return m[1];
}

/**
 * Search for a track by URL or keyword using YouTube's internal Innertube API.
 * Works reliably on datacenter IPs — no cookies or yt-dlp needed.
 */
export async function searchTrack(
  query: string,
  requester: GuildMember,
): Promise<Track | null> {
  const yt = await getSearchClient();

  if (YOUTUBE_URL_RE.test(query)) {
    const videoId = extractVideoId(query);
    const info = await yt.getBasicInfo(videoId);
    const b = info.basic_info;
    return {
      title: b.title ?? 'Unknown Title',
      url: `https://www.youtube.com/watch?v=${b.id}`,
      duration: b.duration ?? 0,
      thumbnail: b.thumbnail?.[0]?.url ?? '',
      requester: requester.user.tag,
      requesterId: requester.user.id,
    };
  }

  const results = await yt.search(query, { type: 'video' });
  const video = results.videos?.[0] as any;
  if (!video?.id) return null;

  return {
    title: video.title?.text ?? video.title ?? 'Unknown Title',
    url: `https://www.youtube.com/watch?v=${video.id}`,
    duration: video.duration?.seconds ?? 0,
    thumbnail: video.thumbnails?.[0]?.url ?? '',
    requester: requester.user.tag,
    requesterId: requester.user.id,
  };
}

/**
 * Create an AudioResource for the given YouTube URL.
 * Uses Innertube to fetch the audio stream (bypasses bot detection),
 * then pipes through FFmpeg for raw PCM + inline volume control.
 */
export async function createStream(url: string, volume: number = 0.5) {
  // Full client with player needed to decipher stream URLs
  const yt = await Innertube.create();
  const videoId = extractVideoId(url);
  const info = await yt.getInfo(videoId);

  const webStream = await info.download({
    type: 'audio',
    quality: 'best',
    format: 'webm',
  });

  // Convert Web ReadableStream → Node.js Readable (Node 18+ / all our targets)
  const audioInput = Readable.fromWeb(webStream as any);

  // Transcode to raw PCM so @discordjs/voice can apply inline volume
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-analyzeduration', '0',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  );

  audioInput.pipe(ffmpeg.stdin);

  // Prevent unhandled errors crashing the process
  audioInput.on('error', () => ffmpeg.stdin.destroy());
  ffmpeg.stdin.on('error', () => { /* ignore broken pipe */ });
  ffmpeg.stderr.on('data', (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.error('[FFmpeg]', msg);
  });

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true,
  });

  resource.volume?.setVolume(volume);

  return resource;
}
