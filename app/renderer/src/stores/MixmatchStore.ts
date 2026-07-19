import { makeAutoObservable, reaction, runInAction } from 'mobx';
import { scoreMixmatchRules, type TrackRow } from '@stentordeck/shared';
import { invoke } from '../ipc/client';
import type { DeckStore } from './DeckStore';
import type { LibraryStore } from './LibraryStore';
import {
  loadedTrackIds,
  playingReferenceBpm,
  playingReferenceKey,
} from './mixReferenceKey';
import type { SessionPlayedStore } from './SessionPlayedStore';
import { settingsStore } from './SettingsStore';

export type MixmatchDeps = {
  deckA: DeckStore;
  deckB: DeckStore;
  library: LibraryStore;
  session: SessionPlayedStore;
};

/**
 * V2-B rules-only “Next up” shortlist (library tracks).
 * No LLM / Spotify / auto-load.
 */
export class MixmatchStore {
  suggestions: TrackRow[] = [];
  status: string | null = null;
  private pool: TrackRow[] = [];
  private poolAtCount = -1;
  private disposeReaction: (() => void) | null = null;

  constructor(private readonly getDeps: () => MixmatchDeps) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  start(): void {
    if (this.disposeReaction) return;
    this.disposeReaction = reaction(
      () => {
        const { deckA, deckB, library, session } = this.getDeps();
        return {
          mode: settingsStore.settings.ai.mixmatch,
          aState: deckA.state,
          bState: deckB.state,
          aKey: deckA.keyCamelot,
          bKey: deckB.keyCamelot,
          aBpm: deckA.pitchOnlyBpm,
          bBpm: deckB.pitchOnlyBpm,
          aId: deckA.libraryTrackId,
          bId: deckB.libraryTrackId,
          played: session.playedCount,
          trackCount: library.trackCount,
        };
      },
      () => {
        void this.recompute();
      },
      { fireImmediately: true },
    );
  }

  stop(): void {
    this.disposeReaction?.();
    this.disposeReaction = null;
  }

  get enabled(): boolean {
    return settingsStore.settings.ai.mixmatch === 'rules';
  }

  private async ensurePool(): Promise<TrackRow[]> {
    const { library } = this.getDeps();
    if (library.trackCount === 0) {
      this.pool = [];
      this.poolAtCount = 0;
      return [];
    }
    if (this.pool.length > 0 && this.poolAtCount === library.trackCount) {
      return this.pool;
    }
    const rows = await invoke('library:query', {
      folder: null,
      search: null,
      sort: 'filename',
      limit: 5000,
    });
    runInAction(() => {
      this.pool = rows;
      this.poolAtCount = library.trackCount;
    });
    return rows;
  }

  /** Force pool refresh (e.g. after analysis commit). */
  invalidatePool(): void {
    this.pool = [];
    this.poolAtCount = -1;
    void this.recompute();
  }

  async recompute(): Promise<void> {
    if (!this.enabled) {
      runInAction(() => {
        this.suggestions = [];
        this.status = null;
      });
      return;
    }

    const { deckA, deckB, session } = this.getDeps();
    const refKey = playingReferenceKey(deckA, deckB);
    const refBpm = playingReferenceBpm(deckA, deckB);
    if (refKey == null && refBpm == null) {
      runInAction(() => {
        this.suggestions = [];
        this.status = 'Play a track to get suggestions';
      });
      return;
    }

    try {
      const pool = await this.ensurePool();
      const played = new Set<number>();
      for (const t of pool) {
        if (session.isPlayed(t.id)) played.add(t.id);
      }
      const ranked = scoreMixmatchRules(pool, {
        refKey,
        refBpm,
        excludeIds: loadedTrackIds(deckA, deckB),
        playedIds: played,
        limit: 8,
      });
      const byId = new Map(pool.map((t) => [t.id, t]));
      const next = ranked
        .map((r) => byId.get(r.id))
        .filter((t): t is TrackRow => t != null);
      runInAction(() => {
        this.suggestions = next;
        this.status =
          next.length === 0
            ? 'No fits found yet — analyse keys/BPM in Library'
            : null;
      });
    } catch (err) {
      runInAction(() => {
        this.suggestions = [];
        this.status = err instanceof Error ? err.message : String(err);
      });
    }
  }
}
