# V2-B — Rules mixmatch (“Next up”)

**Status:** IN PROGRESS (opened 2026-07-19)  
**Reads:** [`BACKLOG-v2-spotify-ai.md`](./BACKLOG-v2-spotify-ai.md) D2/D4 suggest-only, R4.2, R5.*, R6.*  
**Depends on:** E4 library + E5 analysis (BPM/key on tracks).

## Goal

Suggest **5–10 local library tracks** that fit the **currently playing** deck using **pure rules** (Camelot + BPM). Human loads. No API keys, no Spotify, no auto-load.

## Acceptance criteria

- [x] Settings → Library → **Next up (mixmatch)** = `Off` | `Rules` (default Off).
- [x] When Rules is on and a deck is **playing**, Library shows a **Next up** strip with up to 8 scored tracks.
- [x] Scoring uses Camelot soft-rank bands + BPM proximity (half/double aware); excludes tracks loaded on A/B; demotes session-played.
- [x] Empty states: nothing playing → “Play a track…”; no candidates → short hint to analyse.
- [x] Load A / Load B buttons respect playing interlock (R4.2) — never auto-`load()`.
- [x] Pure scorer unit-tested in `shared/src/mixmatchRules.ts` (CI, no hardware).
- [ ] Owner booth smoke: enable Rules, play a keyed track, see sensible neighbours, load idle deck by hand.

## Out of scope (later slices)

- V2-C LLM rerank / provider settings  
- V2-D Spotify  
- V2-E Co-pilot auto-load  

## Spec links

- Backlog decisions: [`BACKLOG-v2-spotify-ai.md`](./BACKLOG-v2-spotify-ai.md)  
- Harmonic soft-rank (Library list): `library.harmonicBoost` in [`07-settings-schema.md`](./07-settings-schema.md)  
