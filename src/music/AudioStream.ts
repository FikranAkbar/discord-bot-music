import { spawn } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createAudioResource, StreamType, AudioResource } from '@discordjs/voice';
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

/** Returns --cookies flag args if a cookies file exists, otherwise empty array. */
function getCookiesArgs(): string[] {
  const cookiesPath =
    process.env.YOUTUBE_COOKIES_PATH ??
    path.join(os.homedir(), 'yt-dlp-cookies.txt');
  return existsSync(cookiesPath) ? ['--cookies', cookiesPath] : [];
}

/**
 * Get a direct audio CDN URL via yt-dlp.
 * Uses tv_embedded client — works on datacenter IPs without PO token.
 * Falls back to web client with cookies if tv_embedded fails.
 */
function getAudioUrl(url: string, cookiesArgs: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      '--no-playlist',
      '--no-warnings',
      // tv_embedded: works on datacenter IPs, no PO token needed, has DASH audio formats
      '--extractor-args', 'youtube:player_client=tv_embedded,web',
      '-f', 'bestaudio/best',
      '--get-url',
      ...cookiesArgs,
      url,
    ]);

    let stdout = '';
    let stderr = '';

    ytdlp.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    ytdlp.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    ytdlp.on('close', (code) => {
      const streamUrl = stdout.trim().split('\n')[0].trim();
      if (code !== 0 || !streamUrl) {
        reject(new Error(stderr.replace(/\s+/g, ' ').trim() || `yt-dlp exited with code ${code}`));
      } else {
        resolve(streamUrl);
      }
    });

    ytdlp.on('error', (err) =>
      reject(new Error(`yt-dlp not found: ${err.message}`)),
    );
  });
}

/**
 * Create an AudioResource for the given YouTube URL.
 * 1. yt-dlp resolves the direct CDN audio URL (tv_embedded client, no PO token needed)
 * 2. FFmpeg fetches and transcodes to raw PCM for inline volume control
 */
export function createStream(url: string, volume: number = 0.5): Promise<AudioResource> {
  return new Promise((resolve, reject) => {
    const cookiesArgs = getCookiesArgs();

    getAudioUrl(url, cookiesArgs).then((audioUrl) => {
      // FFmpeg fetches the CDN URL directly — no yt-dlp stdout pipe needed
      const ffmpeg = spawn(
        'ffmpeg',
        [
          '-reconnect', '1',
          '-reconnect_streamed', '1',
          '-reconnect_delay_max', '5',
          '-analyzeduration', '0',
          '-loglevel', 'error',
          '-i', audioUrl,
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2',
          'pipe:1',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );

      ffmpeg.stderr.on('data', (d: Buffer) => {
        const msg = d.toString().trim();
        if (msg) console.error('[FFmpeg]', msg);
      });

      ffmpeg.on('error', (err) => reject(new Error(`FFmpeg error: ${err.message}`)));

      const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.Raw,
        inlineVolume: true,
      });
      resource.volume?.setVolume(volume);
      resolve(resource);
    }).catch(reject);
  });
}
