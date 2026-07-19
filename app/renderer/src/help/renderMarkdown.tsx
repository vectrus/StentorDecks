import type { ReactNode } from 'react';
import { resolveHelpImageSrc } from './helpScreenshots';

/** Tiny markdown subset for operator guides — no new dependency. */
function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      nodes.push(<code key={key++}>{tok.slice(1, -1)}</code>);
    } else {
      const link = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const label = link?.[1];
      const href = link?.[2];
      if (label && href) {
        // Keep in-app help offline: show label only for relative/spec links.
        if (href.startsWith('http://') || href.startsWith('https://')) {
          nodes.push(
            <a key={key++} href={href} target="_blank" rel="noreferrer">
              {label}
            </a>,
          );
        } else {
          nodes.push(<span key={key++}>{label}</span>);
        }
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function isTableSep(line: string): boolean {
  return /^\|?[\s:-]+\|[\s|:-]+$/.test(line.trim());
}

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return t.split('|').map((c) => c.trim());
}

export function RenderMarkdown(props: { source: string }): ReactNode {
  const lines = props.source.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (line.trim() === '') {
      i += 1;
      continue;
    }

    if (line.trim() === '---') {
      out.push(<hr key={k++} />);
      i += 1;
      continue;
    }

    const imgLine = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (imgLine) {
      const alt = imgLine[1] ?? '';
      const href = imgLine[2] ?? '';
      const src = resolveHelpImageSrc(href);
      if (src) {
        out.push(
          <figure key={k++} className="help-figure">
            <img className="help-img" src={src} alt={alt} loading="lazy" />
            {alt ? <figcaption className="help-figcap">{alt}</figcaption> : null}
          </figure>,
        );
      }
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        buf.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // closing fence
      out.push(
        <pre key={k++} className="help-pre">
          <code>{buf.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h?.[1] && h[2]) {
      const level = h[1].length;
      const text = h[2];
      if (level === 1) out.push(<h1 key={k++}>{inline(text)}</h1>);
      else if (level === 2) out.push(<h2 key={k++}>{inline(text)}</h2>);
      else out.push(<h3 key={k++}>{inline(text)}</h3>);
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1] ?? '')) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        rows.push(splitRow(lines[i] ?? ''));
        i += 1;
      }
      out.push(
        <table key={k++} className="help-table">
          <thead>
            <tr>
              {header.map((c, ci) => (
                <th key={ci}>{inline(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((c, ci) => (
                  <td key={ci}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    if (/^[-*]\s+/.test(line.trim()) || /^\d+\.\s+/.test(line.trim())) {
      const ordered = /^\d+\.\s+/.test(line.trim());
      const items: string[] = [];
      while (i < lines.length) {
        const L = (lines[i] ?? '').trim();
        if (ordered) {
          if (!/^\d+\.\s+/.test(L)) break;
          items.push(L.replace(/^\d+\.\s+/, ''));
        } else {
          if (!/^[-*]\s+/.test(L)) break;
          items.push(L.replace(/^[-*]\s+/, ''));
        }
        i += 1;
      }
      const Tag = ordered ? 'ol' : 'ul';
      out.push(
        <Tag key={k++} className="help-list">
          {items.map((item, ii) => (
            <li key={ii}>{inline(item)}</li>
          ))}
        </Tag>,
      );
      continue;
    }

    // Paragraph: gather until blank
    const para: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const n = lines[i] ?? '';
      if (n.trim() === '') break;
      if (n.startsWith('#') || n.startsWith('```') || n.trim() === '---') break;
      if (n.trim().startsWith('|')) break;
      if (/^[-*]\s+/.test(n.trim()) || /^\d+\.\s+/.test(n.trim())) break;
      para.push(n);
      i += 1;
    }
    out.push(<p key={k++}>{inline(para.join(' '))}</p>);
  }

  return <>{out}</>;
}
