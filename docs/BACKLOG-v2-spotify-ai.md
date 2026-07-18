# Backlog v2 — Spotify browse + AI mixmatch / autoplay

**Status:** PARKED — not v1. Do not implement until v1 (E1–E7) ships and Julius opens a v2 epic.  
**Decided by:** agent recommendation (2026-07-18), locked here with rationale so we don’t re-litigate.  
**Owner genres (taste lanes):** techno · minimal · techy · trance · club · chill · afterparty.

v1 still excludes streaming services (see root README / docs/README). This doc is the **v2 product decision record** only.

---

## Locked decisions

### D1 — Spotify: hybrid browse + local match (not Spotify audio)

**Choice:** Spotify OAuth for **search / browse / playlist peek** only. Playback always from **local files**. A Spotify hit is playable only when linked to a library file (ISRC → AcoustID/fingerprint → fuzzy title+artist+duration → manual link). Unmatched tracks go to a **wantlist**, not the decks.

**Why:**

- Preserves the entire v1 audio stack (Plan A/B, cue on 3–4, soft takeover, offline booth).
- Avoids Spotify Web Playback / Connect complexity, DRM, and TOU landmines inside a dual-output DJ engine.
- Julius’s booth must keep working if the network dies mid-set; discovery can be online, sound must not depend on it.

**Rejected:** C (Spotify as audio source) for v2.0. Revisit only if local match rate is high *and* there is a clear offline fallback story.

---

### D2 — Mixmatch: hybrid pipeline (rules → embeddings → LLM rank)

**Choice:** Build a **candidate set from local analysis** (BPM, Camelot/key, energy/loudness, genre lane, recently played). Optionally score with **local embeddings**. Then an **LLM (OpenAI or Anthropic, user-chosen)** reranks to **5–10 tracks** and writes a one-line “why” each. Model output is **constrained to known `trackId`s** (JSON schema); hallucinated IDs are dropped.

**Why:**

- Analysis (E5) already owns truth for BPM/key; don’t ask a chat model to invent musical facts.
- LLM is good at taste language (“keep it minimal, don’t jump to peak trance”) and explanations.
- Constrained IDs prevent the classic “AI recommends a track you don’t have” failure.
- Works in **degraded mode** without API keys (rules-only top 5–10).

**Rejected:** Full-LLM planner with no local filter (too brittle, expensive, hallucinates). Pure embeddings with no LLM (weaker “vibe” control and no explanations).

---

### D3 — AI provider: user choice, metadata-only upload

**Choice:** Settings → AI: **provider = Anthropic | OpenAI | Off**, model dropdown, API key in OS-secure storage (never git). Default **Off** until configured. Payload = now-playing summary + shortlist features + genre/energy intent — **never raw audio files**.

**Why:**

- Julius asked for OpenAI *or* Anthropic; both stay first-class.
- Booth privacy + cost: don’t upload sets of WAVs.
- “Off” keeps the app usable without subscriptions.

---

### D4 — Autoplay: Co-pilot as v2 default (not full robot DJ)

**Choice:** Three modes, ship order:

1. **Suggest only** — fills Next 5–10; human loads/mixes (always available).  
2. **Co-pilot (v2 default when Autoplay is on)** — when the **idle** deck is empty, auto-`load()` the top suggestion; **never** load into a playing deck (same interlock spirit as R4.2); human still owns faders, EQ, PFL, when to blend.  
3. **Full auto** — optional, off by default, scary label; timed/phrase-assisted fades. Requires stronger analysis confidence gates.

**UI intent:** Genre chips (the seven lanes) + energy (`warmup | groove | peak | afterparty`) + BPM band lock + big **STOP AI** control (mouse first; MIDI-learn later).

**Why:**

- Full auto will eventually dump a dancefloor; Co-pilot gives “AI does the homework, Julius drives the mixer,” which matches a real RMX2 booth.
- Respects load interlock and keeps musical responsibility on the channel faders.
- Suggest-only is the safe offline / no-key path.

**Rejected:** Full auto as default.

---

### D5 — Scope of suggestions: library-first; Spotify-only = wantlist

**Choice:** Mixmatch / autoplay queues **library tracks only**. Spotify-only results may appear in a separate **Wantlist** (for later acquisition), never auto-loaded to a deck.

**Why:** Auto-loading silence or a stream breaks the product promise. Wantlist still makes Spotify useful for collection growth.

---

## Phased delivery (when v2 opens)

| Phase | Deliverable | Depends on |
|---|---|---|
| V2-A | Genre lane tags on tracks (manual + optional AI tagger for the 7 lanes) | E4 library |
| V2-B | Local mixmatch list (rules from E5 analysis → 5–10) | E5 |
| V2-C | LLM rerank + explanations; provider settings | V2-B; network optional |
| V2-D | Spotify OAuth browse + local match + wantlist | V2-A |
| V2-E | Co-pilot autoplay + STOP AI | V2-B/C; deck load APIs; **V2-Q queue UI spike** |
| V2-F | Full auto (optional) | V2-E + strong phrase/energy confidence |

---

## Design spike (later) — Prep library as queue / playlist surface

**Status:** PARKED — examine when opening V2-E (Co-pilot), not in v1.  
**Owner note (2026-07-18):** Julius — “examine later if we can use [Prep library] for a queue (playlist) as well” for the AI-plays-for-us roadmap item.

**Idea to evaluate (not decided):**

v1 Prep is browse-only (disk folders = crates; no in-app playlists). Co-pilot / Suggest-only already imply an ordered **Next N** list of library `trackId`s. Before inventing a separate playlist product, spike whether Prep’s library chrome (or a thin mode beside it) can host that queue:

| Question | Why it matters |
|---|---|
| Same list vs new “Queue” panel? | Reuse cursor / MIDI browse / Load A·B habits vs avoid confusing crates with a live queue |
| Ordered Next N editable by human? | Co-pilot default loads idle deck from top; human may want reorder / skip / pin |
| Persist session queue across restart? | Nice for long sets; not required for Suggest-only |
| Harmonic `~` hints + mixmatch? | Prep already shows Camelot fit vs playing deck — queue rows could reuse that |
| Never break R4.2 | Auto-load only into **idle** deck; playing deck stays human-gated |

**Non-decision:** This does **not** reopen v1 playlists. Disk folders stay the crates until a v2 epic explicitly changes that.

**Entry point when v2 opens:** spike before or with V2-E; write outcome into this file (adopt / adapt / separate UI).

---

## Non-goals (still out unless reopened)

- Spotify as the live audio engine  
- Cloud upload of full audio for “AI listening”  
- Replacing RMX2 / mouse control with chat-only DJing  
- Expanding v1 epic scope to absorb any of this  

---

## Open only if Julius overrides

- Allow Spotify Connect audio as an explicit v2.1 experiment  
- Default provider (Anthropic vs OpenAI) once keys exist — product default can stay **Off** until then  
