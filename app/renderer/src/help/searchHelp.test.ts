import { describe, expect, it } from 'vitest';
import { operatorBody, searchHelp, type HelpTopic } from './searchHelp';

const TOPICS: HelpTopic[] = [
  {
    id: 'a',
    title: 'Getting started',
    tags: ['boot', 'mst', 'volume'],
    body: '# Getting started\n\nMaster starts at **30%**.\n\n## Spec links\n\nSecret eng note.',
  },
  {
    id: 'b',
    title: 'SYNC & jog',
    tags: ['sync', 'jog', 'beatgrid'],
    body: 'Press SYNC on the slave deck. Needs a beatgrid.',
  },
  {
    id: 'c',
    title: 'Library mode',
    tags: ['prep', 'bpm', 'key'],
    body: 'Use Tap and Detect to fix BPM.',
  },
];

describe('operatorBody', () => {
  it('strips Spec links tails', () => {
    const body = TOPICS[0]?.body ?? '';
    expect(operatorBody(body)).not.toContain('Secret eng note');
    expect(operatorBody(body)).toContain('30%');
  });
});

describe('searchHelp', () => {
  it('returns all topics for empty query', () => {
    const hits = searchHelp(TOPICS, '');
    expect(hits).toHaveLength(3);
    expect(hits.map((h) => h.topic.id)).toEqual(['a', 'b', 'c']);
  });

  it('ranks title / tag hits above body-only', () => {
    const hits = searchHelp(TOPICS, 'sync');
    expect(hits[0]?.topic.id).toBe('b');
    expect(hits.every((h) => h.score > 0)).toBe(true);
  });

  it('finds body text and provides a snippet', () => {
    const hits = searchHelp(TOPICS, '30%');
    expect(hits.some((h) => h.topic.id === 'a')).toBe(true);
    const a = hits.find((h) => h.topic.id === 'a');
    expect(a?.snippet).toMatch(/30%/);
  });

  it('does not match only Spec-links content', () => {
    const hits = searchHelp(TOPICS, 'Secret eng');
    expect(hits.filter((h) => h.topic.id === 'a')).toHaveLength(0);
  });
});
