import { spawn } from 'child_process';
import { createAudioResource, StreamType } from '@discordjs/voice';
import * as playdl from 'play-dl';
import { Track } from '../types/index';
import { GuildMember } from 'discord.js';

const YOUTUBE_URL_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/).+/;

/**
 * Search for a track by URL or keyword via play-dl.
 * Returns a Track without requester info filled in (caller sets it).
 */
export async function searchTrack(
  query: string,
  requester: GuildMember,
): Promise<Track | null> {
  try {
    if (YOUTUBE_URL_RE.test(query)) {
      const info = await playdl.video_info(query);
      const v = info.video_details;
      return {
        title: v.title ?? 'Unknown Title',
        url: v.url,
        duration: v.durationInSec ?? 0,
        thumbnail: v.thumbnails[0]?.url ?? '',
        requester: requester.user.tag,
        requesterId: requester.user.id,
      };
    }

    // Keyword search
    const results = await playdl.search(query, {
      source: { youtube: 'video' },
      limit: 1,
    });

    if (!results.length) return null;
    const v = results[0];

    return {
      title: v.title ?? 'Unknown Title',
      url: v.url,
      duration: v.durationInSec ?? 0,
      thumbnail: v.thumbnails[0]?.url ?? '',
      requester: requester.user.tag,
      requesterId: requester.user.id,
    };
  } catch (err) {
    console.error('[AudioStream] searchTrack error:', err);
    return null;
  }
}

/**
 * Create an AudioResource for the given YouTube URL.
 * Uses play-dl to fetch the stream, then pipes through FFmpeg
 * to produce raw PCM, enabling dynamic inline volume control.
 */
export async function createStream(url: string, volume: number = 0.5) {
  const source = await playdl.stream(url, { quality: 2 });

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

  source.stream.pipe(ffmpeg.stdin);

  // Prevent unhandled errors crashing the process
  source.stream.on('error', () => ffmpeg.stdin.destroy());
  ffmpeg.stdin.on('error', () => { /* ignore broken pipe */ });
  ffmpeg.stderr.on('data', (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.error('[FFmpeg]', msg);
  });

  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.Raw,
    inlineVolume: true,
  });

  // Set initial volume (play-dl + ffmpeg pipeline bypasses FFmpeg volume filter,
  // so we rely on @discordjs/voice's inline volume transformer)
  resource.volume?.setVolume(volume);

  return resource;
}
