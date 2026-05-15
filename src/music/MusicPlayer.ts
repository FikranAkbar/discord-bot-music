import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  VoiceConnection,
  createAudioPlayer,
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { VoiceBasedChannel, TextChannel } from 'discord.js';
import { MusicQueue } from './MusicQueue';
import { createStream } from './AudioStream';
import { Track } from '../types/index';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class GuildPlayer {
  readonly guildId: string;
  readonly queue: MusicQueue;

  private _connection: VoiceConnection | null = null;
  private _player: AudioPlayer;
  private _currentResource: AudioResource | null = null;
  private _idleTimer: NodeJS.Timeout | null = null;

  /** Text channel used to send auto-notifications (optional) */
  textChannel: TextChannel | null = null;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.queue = new MusicQueue();
    this._player = createAudioPlayer();

    this._player.on(AudioPlayerStatus.Idle, () => {
      this._currentResource = null;
      void this._onIdle();
    });

    this._player.on('error', (err) => {
      console.error(`[GuildPlayer:${guildId}] AudioPlayer error:`, err.message);
      void this._onIdle(); // try to advance on error
    });
  }

  get isConnected(): boolean {
    return this._connection !== null;
  }

  get isPlaying(): boolean {
    return this._player.state.status === AudioPlayerStatus.Playing;
  }

  get isPaused(): boolean {
    return this._player.state.status === AudioPlayerStatus.Paused;
  }

  get currentResource(): AudioResource | null {
    return this._currentResource;
  }

  /** Join (or move to) a voice channel */
  async connect(channel: VoiceBasedChannel): Promise<void> {
    if (this._connection) {
      // Already in a channel — no need to reconnect if same channel
      if (this._connection.joinConfig.channelId === channel.id) return;
      // Move to new channel
      this._connection.destroy();
    }

    this._connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    this._connection.subscribe(this._player);

    try {
      await entersState(this._connection, VoiceConnectionStatus.Ready, 10_000);
    } catch {
      this._connection.destroy();
      this._connection = null;
      throw new Error('Failed to join voice channel within 10 seconds.');
    }

    this._connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Try to reconnect
        await Promise.race([
          entersState(this._connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this._connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });
  }

  /** Add a track to the queue and start playback if idle */
  async enqueue(track: Track): Promise<void> {
    this.queue.add(track);
    // Only start playback if nothing is currently playing/paused.
    // Play queue.current() directly — do NOT call advance() here,
    // because advance() removes the current track (it is meant to be
    // called only when a track finishes).
    if (!this.isPlaying && !this.isPaused) {
      const current = this.queue.current();
      if (current) await this._playTrack(current);
    }
  }

  /** Play a specific track (must already be at queue index 0) */
  private async _playTrack(track: Track): Promise<void> {
    this._clearIdleTimer();
    try {
      const resource = await createStream(track.url, this.queue.volume);
      this._currentResource = resource;
      this._player.play(resource);
    } catch (err) {
      console.error(`[GuildPlayer:${this.guildId}] Stream error:`, err);
      // Remove broken track and try to play the next one
      this.queue.tracks.shift();
      const next = this.queue.current();
      if (next) await this._playTrack(next);
      else this._startIdleTimer();
    }
  }

  /** Called when the AudioPlayer goes Idle (track finished or skipped) */
  private async _onIdle(): Promise<void> {
    // advance() removes the finished track and returns the next one
    const next = this.queue.advance();
    if (next) {
      await this._playTrack(next);
    } else {
      this._startIdleTimer();
    }
  }

  pause(): boolean {
    return this._player.pause();
  }

  resume(): boolean {
    return this._player.unpause();
  }

  /** Skip the current track */
  async skip(): Promise<Track | null> {
    const skipped = this.queue.current();
    // Force idle event by stopping current playback
    this._player.stop(true);
    return skipped;
  }

  /** Stop playback and clear the queue */
  stop(): void {
    this.queue.clear();
    this._player.stop(true);
    this._clearIdleTimer();
  }

  /** Disconnect from voice and clean up */
  destroy(): void {
    this._clearIdleTimer();
    this.queue.clear();
    this._player.stop(true);
    this._connection?.destroy();
    this._connection = null;
    musicManager.remove(this.guildId);
  }

  /** Dynamically update volume on the current resource */
  setVolume(volume: number): void {
    this.queue.volume = volume;
    this._currentResource?.volume?.setVolume(volume);
  }

  private _startIdleTimer(): void {
    this._clearIdleTimer();
    this._idleTimer = setTimeout(() => {
      console.log(`[GuildPlayer:${this.guildId}] Idle timeout — leaving voice channel.`);
      this.destroy();
    }, IDLE_TIMEOUT_MS);
  }

  private _clearIdleTimer(): void {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  }
}

/** Singleton manager for all guild players */
class MusicManager {
  private players = new Map<string, GuildPlayer>();

  getOrCreate(guildId: string): GuildPlayer {
    if (!this.players.has(guildId)) {
      this.players.set(guildId, new GuildPlayer(guildId));
    }
    return this.players.get(guildId)!;
  }

  get(guildId: string): GuildPlayer | undefined {
    return this.players.get(guildId);
  }

  remove(guildId: string): void {
    this.players.delete(guildId);
  }
}

export const musicManager = new MusicManager();
