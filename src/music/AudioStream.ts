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
 * Create an AudioResource for the given YouTube URL.
 * Uses yt-dlp (with cookies for datacenter IPs) → FFmpeg (raw PCM) → inline volume.
 * Rejects early if yt-dlp fails before producing any audio data.
 */
export function createStream(url: string, volume: number = 0.5): Promise<AudioResource> {
  return new Promise((resolve, reject) => {
    const cookiesArgs = getCookiesArgs();

    const ytdlp = spawn('yt-dlp', [
      '--no-playlist',
      '--no-warnings',
      // Force iOS/TV-embedded clients: they provide direct (non-ciphered) URLs
      // and are NOT blocked on datacenter IPs unlike android_vr/web clients
      '--extractor-args', 'youtube:player_client=ios,tv_embedded',
      '-f', 'bestaudio/best',
      '-o', '-',
      ...cookiesArgs,
      url,
    ]);

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

    ytdlp.stdout.pipe(ffmpeg.stdin);
    ytdlp.stdout.on('error', () => ffmpeg.stdin.destroy());
    ffmpeg.stdin.on('error', () => { /* ignore broken pipe */ });
    ffmpeg.stderr.on('data', (d: Buffer) => {
      const msg = d.toString().trim();
      if (msg) console.error('[FFmpeg]', msg);
    });

    let settled = false;
    let stderrBuf = '';

    ytdlp.stderr.on('data', (d: Buffer) => { stderrBuf += d.toString(); });

    // Fail fast: if yt-dlp exits before producing any stdout, surface the error
    ytdlp.on('close', (code) => {
      if (!settled && code !== 0) {
        settled = true;
        const msg = stderrBuf.replace(/\s+/g, ' ').trim() || `yt-dlp exited with code ${code}`;
        reject(new Error(msg));
      }
    });

    ytdlp.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(new Error(`yt-dlp not found: ${err.message}. Run: sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod +rx /usr/local/bin/yt-dlp`));
      }
    });

    // Resolve as soon as yt-dlp produces data — stream is confirmed working
    ytdlp.stdout.once('data', () => {
      if (!settled) {
        settled = true;
        const resource = createAudioResource(ffmpeg.stdout, {
          inputType: StreamType.Raw,
          inlineVolume: true,
        });
        resource.volume?.setVolume(volume);
        resolve(resource);
      }
    });
  });
}
