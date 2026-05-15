import { spawn } from 'child_process';
import { createAudioResource, StreamType } from '@discordjs/voice';
import * as playdl from 'play-dl';
import { Track } from '../types/index';
import { GuildMember } from 'discord.js';

const YOUTUBE_URL_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/).+/;

/**
 * Search for a track by URL or keyword via yt-dlp.
 * Falls back to play-dl search for keyword queries.
 */
export async function searchTrack(
  query: string,
  requester: GuildMember,
): Promise<Track | null> {
  const searchQuery = YOUTUBE_URL_RE.test(query) ? query : `ytsearch1:${query}`;
  return await getTrackInfoYtDlp(searchQuery, requester);
}

/** Get track metadata via yt-dlp (reliable on EC2/datacenter IPs) */
async function getTrackInfoYtDlp(query: string, requester: GuildMember): Promise<Track | null> {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '--no-playlist',
      '--dump-json',
      '--no-warnings',
      query,
    ]);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    ytdlp.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    ytdlp.on('close', (code) => {
      if (code !== 0 || !stdout.trim()) {
        reject(new Error(stderr.trim() || 'yt-dlp returned no results'));
        return;
      }
      try {
        // yt-dlp may return multiple JSON lines for playlists — take the first
        const info = JSON.parse(stdout.trim().split('\n')[0]);
        resolve({
          title: info.title ?? 'Unknown Title',
          url: info.webpage_url ?? info.url,
          duration: info.duration ?? 0,
          thumbnail: info.thumbnail ?? '',
          requester: requester.user.tag,
          requesterId: requester.user.id,
        });
      } catch (e) {
        reject(new Error('Failed to parse yt-dlp output'));
      }
    });

    ytdlp.on('error', (err) => reject(new Error(`yt-dlp not found: ${err.message}. Install with: pip3 install yt-dlp`)));
  });
}

/**
 * Create an AudioResource for the given YouTube URL.
 * Pipes yt-dlp → FFmpeg (raw PCM) for inline volume control.
 * yt-dlp is much more reliable than play-dl on datacenter IPs.
 */
export async function createStream(url: string, volume: number = 0.5) {
  // yt-dlp writes audio to stdout, FFmpeg reads from stdin
  const ytdlp = spawn('yt-dlp', [
    '--no-playlist',
    '--no-warnings',
    '-f', 'bestaudio[ext=webm]/bestaudio/best',
    '-o', '-',   // output to stdout
    url,
  ]);

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

  // Pipe yt-dlp stdout → FFmpeg stdin
  ytdlp.stdout.pipe(ffmpeg.stdin);

  // Prevent unhandled errors crashing the process
  ytdlp.stdout.on('error', () => ffmpeg.stdin.destroy());
  ytdlp.stderr.on('data', (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.error('[yt-dlp]', msg);
  });
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
