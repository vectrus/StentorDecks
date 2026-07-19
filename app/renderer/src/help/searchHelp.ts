/** Pure help search — titles, tags, and body (E7 operator docs). */

export type HelpTopic = {
  id: string;
  title: string;
  tags: readonly string[];
  /** Markdown body (operator-facing; Spec links stripped at display time). */
  body: string;
};

export type HelpSearchHit = {
  topic: HelpTopic;
  score: number;
  /** Short excerpt around the first body match, if any. */
  snippet: string | null;
};

/** Drop engineer-only tails so Help never surfaces Spec links / backlog notes. */
export function operatorBody(markdown: string): string {
  let body = markdown;
  const cut = body.search(/\n##\s+Spec links\b/i);
  if (cut !== -1) body = body.slice(0, cut);
  // Keep `![…](…)` lines — same screenshots as website (bundled from docs/screenshots/).
  return body.replace(/\n{3,}/g, '\n\n').trimEnd();
}

/** Text used for search ranking/snippets — ignore image markup noise. */
export function searchableBody(markdown: string): string {
  return operatorBody(markdown)
    .replace(/^!\[[^\]]*\]\([^)]+\)\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9½×]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function excerptAround(hay: string, needle: string, radius = 48): string | null {
  const i = hay.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return null;
  const start = Math.max(0, i - radius);
  const end = Math.min(hay.length, i + needle.length + radius);
  let s = hay.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) s = `…${s}`;
  if (end < hay.length) s = `${s}…`;
  return s;
}

/** Rank topics for a free-text query. Empty query → all topics in catalog order. */
export function searchHelp(topics: readonly HelpTopic[], query: string): HelpSearchHit[] {
  const q = query.trim();
  if (!q) {
    return topics.map((topic) => ({ topic, score: 0, snippet: null }));
  }

  const tokens = tokenize(q);
  const terms = tokens.length > 0 ? tokens : [q.toLowerCase()];

  const hits: HelpSearchHit[] = [];
  for (const topic of topics) {
    const title = topic.title.toLowerCase();
    const tags = topic.tags.map((t) => t.toLowerCase()).join(' ');
    const plain = searchableBody(topic.body);
    const body = plain.toLowerCase();
    let score = 0;
    let snippet: string | null = null;

    for (const term of terms) {
      if (title === term) score += 40;
      else if (title.includes(term)) score += 24;
      if (tags.split(/\s+/).includes(term)) score += 18;
      else if (tags.includes(term)) score += 12;
      if (body.includes(term)) {
        score += 6;
        if (!snippet) snippet = excerptAround(plain, term);
      }
    }

    // Whole-phrase bonus
    const phrase = q.toLowerCase();
    if (title.includes(phrase)) score += 10;
    if (body.includes(phrase)) {
      score += 4;
      if (!snippet) snippet = excerptAround(plain, phrase);
    }

    if (score > 0) hits.push({ topic, score, snippet });
  }

  hits.sort((a, b) => b.score - a.score || a.topic.title.localeCompare(b.topic.title));
  return hits;
}
