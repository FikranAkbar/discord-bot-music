import { Track, LoopMode } from '../types/index';

export class MusicQueue {
  tracks: Track[] = [];
  loopMode: LoopMode = 'off';
  volume: number = 0.5; // 0.0 – 1.0

  /** Currently playing track (index 0) */
  current(): Track | null {
    return this.tracks[0] ?? null;
  }

  /** Add a track to the end of the queue */
  add(track: Track): void {
    this.tracks.push(track);
  }

  /**
   * Advance the queue and return the next track to play.
   * Respects loop mode.
   */
  advance(): Track | null {
    if (this.tracks.length === 0) return null;

    switch (this.loopMode) {
      case 'track':
        // Repeat the same track — don't remove it
        return this.tracks[0];

      case 'queue': {
        // Move current track to the end of the queue
        const current = this.tracks.shift()!;
        this.tracks.push(current);
        return this.tracks[0] ?? null;
      }

      case 'off':
      default:
        this.tracks.shift(); // Remove finished track
        return this.tracks[0] ?? null;
    }
  }

  /** Shuffle all tracks except the currently playing one */
  shuffle(): void {
    if (this.tracks.length <= 1) return;
    const current = this.tracks.shift()!;
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
    this.tracks.unshift(current);
  }

  /**
   * Remove a track at the given 1-indexed position.
   * Position 1 is the currently playing track.
   * Returns the removed track, or undefined if out of range.
   */
  remove(position: number): Track | undefined {
    if (position < 1 || position > this.tracks.length) return undefined;
    const [removed] = this.tracks.splice(position - 1, 1);
    return removed;
  }

  /** Remove all tracks including the currently playing one */
  clear(): void {
    this.tracks = [];
  }

  /** Total number of tracks (including now playing) */
  get size(): number {
    return this.tracks.length;
  }

  /** Number of tracks waiting after the current one */
  get upcomingCount(): number {
    return Math.max(0, this.tracks.length - 1);
  }
}
