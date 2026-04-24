import React from 'react';
import type { InlineNode } from '../../../types.js';
import { Inline } from './Inline.js';

interface TableProps {
  head: InlineNode[][];
  rows: InlineNode[][][];
}

type RowKind = 'default' | 'summary';
type CellTone = 'default' | 'positive' | 'negative' | 'warning' | 'neutral';
type CellKind = 'default' | 'numeric' | 'status';

const SUMMARY_ROW_RE = /\b(total|subtotal|grand total|average|avg|median|benchmark|forecast|projection|target)\b/i;
const STATUS_RE = /^(on track|healthy|stable|watch|monitor|at risk|blocked|delayed|done|complete|completed)$/i;

function inlineToText(nodes: InlineNode[]): string {
  return nodes.map(node => {
    switch (node.type) {
      case 'text':
      case 'inlineCode':
        return node.value;
      case 'strong':
      case 'emphasis':
      case 'link':
        return inlineToText(node.children);
      case 'image':
        return node.alt;
      case 'bridge':
        return `${node.marker} ${node.raw}`;
      case 'break':
        return ' ';
      default:
        return '';
    }
  }).join('').replace(/\s+/g, ' ').trim();
}

function normalizeRow(row: InlineNode[][], length: number): InlineNode[][] {
  return Array.from({ length }, (_, i) => row[i] ?? []);
}

function isNumericText(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  const compact = text
    .replace(/[,\s]/g, '')
    .replace(/[$€£¥₹]/g, '')
    .replace(/[()]$/g, '')
    .replace(/^\(/, '-')
    .replace(/[kmbtx]|bps|%|ms|s|sec|mins?|hrs?|days?|mo|qoq|mom|yoy/gi, '');
  return /^[-+]?(\d+(\.\d+)?|\.\d+)$/.test(compact);
}

function detectColumnKinds(rows: string[][], headers: string[]): CellKind[] {
  const columnCount = headers.length;
  return Array.from({ length: columnCount }, (_, colIndex) => {
    const header = headers[colIndex] ?? '';
    const values = rows.map(row => row[colIndex] ?? '').filter(Boolean);
    if (!values.length) return 'default';
    const statusCount = values.filter(value => STATUS_RE.test(value)).length;
    if (statusCount >= Math.ceil(values.length * 0.6)) return 'status';
    const numericCount = values.filter(isNumericText).length;
    if (numericCount >= Math.ceil(values.length * 0.6)) return 'numeric';
    if (/\b(revenue|arr|mrr|count|volume|share|mix|rate|delta|change|growth|margin|profit|loss|pipeline|score|nps|ltv|cac|variance|users|sessions|ctr|cvr)\b/i.test(header)) {
      return 'numeric';
    }
    return 'default';
  });
}

function detectRowKind(firstCell: string): RowKind {
  return SUMMARY_ROW_RE.test(firstCell) ? 'summary' : 'default';
}

function detectCellTone(value: string, kind: CellKind): CellTone {
  const text = value.trim().toLowerCase();
  if (!text) return 'default';
  if (kind === 'status') {
    if (/^(on track|healthy|stable|done|complete|completed)$/.test(text)) return 'positive';
    if (/^(watch|monitor)$/.test(text)) return 'warning';
    if (/^(at risk|blocked|delayed)$/.test(text)) return 'negative';
    return 'neutral';
  }
  if (kind === 'numeric') {
    if (/^(\+|↑|up\b)/.test(text)) return 'positive';
    if (/^(-|↓|down\b|\()/.test(text)) return 'negative';
    if (/^(0|0\.0+|0%|0\.0+%)$/.test(text)) return 'neutral';
  }
  return 'default';
}

function toneStyles(tone: CellTone): React.CSSProperties | undefined {
  switch (tone) {
    case 'positive':
      return {
        color: 'color-mix(in srgb, #15803d 85%, var(--text))',
        background: 'color-mix(in srgb, #22c55e 10%, transparent)',
      };
    case 'negative':
      return {
        color: 'color-mix(in srgb, #b91c1c 88%, var(--text))',
        background: 'color-mix(in srgb, #ef4444 10%, transparent)',
      };
    case 'warning':
      return {
        color: 'color-mix(in srgb, #b45309 85%, var(--text))',
        background: 'color-mix(in srgb, #f59e0b 12%, transparent)',
      };
    case 'neutral':
      return {
        color: 'var(--text-muted)',
        background: 'color-mix(in srgb, var(--surface2) 85%, transparent)',
      };
    default:
      return undefined;
  }
}

export function Table({ head, rows }: TableProps) {
  const columnCount = Math.max(head.length, ...rows.map(row => row.length));
  const normalizedHead = normalizeRow(head, columnCount);
  const normalizedRows = rows.map(row => normalizeRow(row, columnCount));
  const headerText = normalizedHead.map(inlineToText);
  const rowText = normalizedRows.map(row => row.map(inlineToText));
  const columnKinds = detectColumnKinds(rowText, headerText);
  const compact = columnCount >= 5 || rowText.every(row => row.every(cell => cell.length <= 16));
  const minWidth = Math.max(560, columnCount * (compact ? 120 : 148));

  return (
    <div
      className="md4ai-table-wrapper"
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        marginBottom: '1rem',
        border: '1px solid var(--border)',
        borderRadius: '0.85rem',
        background: 'var(--surface)',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <table
        className={`md4ai-table${compact ? ' md4ai-table--compact' : ''}`}
        style={{
          width: '100%',
          minWidth,
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: compact ? '0.8125rem' : '0.875rem',
          lineHeight: 1.5,
        }}
      >
        <thead>
          <tr>
            {normalizedHead.map((cell, i) => {
              const isNumeric = columnKinds[i] === 'numeric';
              return (
                <th
                  key={i}
                  className={isNumeric ? 'md4ai-table__th md4ai-table__th--numeric' : 'md4ai-table__th'}
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    padding: compact ? '0.65rem 0.8rem' : '0.8rem 1rem',
                    textAlign: isNumeric ? 'right' : 'left',
                    verticalAlign: 'bottom',
                    background: 'color-mix(in srgb, var(--surface2) 88%, var(--surface))',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--border)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Inline nodes={cell} />
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {normalizedRows.map((row, rowIndex) => {
            const kind = detectRowKind(rowText[rowIndex]?.[0] ?? '');
            return (
              <tr
                key={rowIndex}
                className={`md4ai-table__row md4ai-table__row--${kind}`}
                style={{
                  background: kind === 'summary'
                    ? 'color-mix(in srgb, var(--accent) 7%, var(--surface))'
                    : rowIndex % 2 === 0
                      ? 'transparent'
                      : 'color-mix(in srgb, var(--surface2) 46%, transparent)',
                }}
              >
                {row.map((cell, colIndex) => {
                  const cellText = rowText[rowIndex]?.[colIndex] ?? '';
                  const cellKind = columnKinds[colIndex];
                  const tone = detectCellTone(cellText, cellKind);
                  const isNumeric = cellKind === 'numeric';
                  const isStatus = cellKind === 'status' && STATUS_RE.test(cellText);
                  return (
                    <td
                      key={colIndex}
                      className={[
                        'md4ai-table__cell',
                        isNumeric ? 'md4ai-table__cell--numeric' : '',
                        tone !== 'default' ? `md4ai-table__cell--${tone}` : '',
                        kind === 'summary' ? 'md4ai-table__cell--summary' : '',
                      ].filter(Boolean).join(' ')}
                      style={{
                        padding: compact ? '0.62rem 0.8rem' : '0.78rem 1rem',
                        textAlign: isNumeric ? 'right' : 'left',
                        verticalAlign: 'top',
                        borderBottom: rowIndex === normalizedRows.length - 1 ? 'none' : '1px solid var(--border)',
                        fontWeight: kind === 'summary' && colIndex === 0 ? 700 : isNumeric ? 600 : 400,
                        fontVariantNumeric: isNumeric ? 'tabular-nums' : undefined,
                        whiteSpace: isNumeric ? 'nowrap' : undefined,
                      }}
                    >
                      {isStatus ? (
                        <span
                          className={`md4ai-table__pill md4ai-table__pill--${tone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            letterSpacing: '0.01em',
                            ...toneStyles(tone),
                          }}
                        >
                          <Inline nodes={cell} />
                        </span>
                      ) : tone !== 'default' ? (
                        <span
                          className={`md4ai-table__tone md4ai-table__tone--${tone}`}
                          style={{
                            display: 'inline-block',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '0.45rem',
                            ...toneStyles(tone),
                          }}
                        >
                          <Inline nodes={cell} />
                        </span>
                      ) : (
                        <Inline nodes={cell} />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
