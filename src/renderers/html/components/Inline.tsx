import React, { useContext } from 'react';
import type { InlineNode } from '../../../types.js';
import { RenderContext } from '../context.js';

interface Props {
  nodes: InlineNode[];
}

// Approximate skeleton dimensions keyed by bridge marker.
// Inline bridges render as inline-block; everything else defaults to block.
const SKELETON_SIZE: Record<string, React.CSSProperties> = {
  // inline
  kpi:        { display: 'inline-block', width: 160, height: 56, borderRadius: '0.95rem', verticalAlign: 'middle', margin: '0.25rem 0' },
  sparkline:  { display: 'inline-block', width: 100, height: 30, borderRadius: '0.5rem',  verticalAlign: 'middle' },
  gauge:      { display: 'inline-block', width: 140, height: 80, borderRadius: '0.5rem',  verticalAlign: 'middle' },
  release:    { display: 'inline-block', width: 220, height: 56, borderRadius: '0.95rem', verticalAlign: 'middle', margin: '0.2rem 0' },
  timeline:   { display: 'inline-block', width: 300, height: 56, borderRadius: '0.95rem', verticalAlign: 'middle', margin: '0.25rem 0' },
  button:     { display: 'inline-block', width: 110, height: 36, borderRadius: '0.5rem',  verticalAlign: 'middle', margin: '0 0.4rem 0.5rem 0' },
  // large block
  servicemap: { display: 'block', width: '100%', maxWidth: 660, height: 310, borderRadius: '1rem', marginBottom: '1rem' },
  candles:    { display: 'block', width: '100%', maxWidth: 760, height: 310, borderRadius: '1rem', marginBottom: '1rem' },
  fileheat:   { display: 'block', width: '100%', maxWidth: 620, height: 280, borderRadius: '1rem', marginBottom: '1rem' },
  pipelineflow:{ display: 'block', width: '100%', maxWidth: 660, height: 310, borderRadius: '1rem', marginBottom: '1rem' },
  agent:      { display: 'block', width: '100%', maxWidth: 560, height: 140, borderRadius: '1rem', marginBottom: '0.9rem' },
  command:    { display: 'block', width: '100%', maxWidth: 620, height: 140, borderRadius: '1rem', marginBottom: '1rem' },
};

// Default block skeleton for any marker not listed above
const DEFAULT_SKELETON: React.CSSProperties = {
  display: 'block', width: '100%', maxWidth: 520, height: 88, borderRadius: '1rem', marginBottom: '1rem',
};

function BridgeSkeleton({ marker }: { marker: string }) {
  const style = SKELETON_SIZE[marker] ?? DEFAULT_SKELETON;
  return <span className="md4ai-bridge-skeleton" style={style} aria-hidden="true" />;
}

export function Inline({ nodes }: Props) {
  const { bridges, bridgeCtx, skeletons } = useContext(RenderContext);

  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'text':
            return <React.Fragment key={i}>{node.value}</React.Fragment>;
          case 'strong':
            return <strong key={i}><Inline nodes={node.children} /></strong>;
          case 'emphasis':
            return <em key={i}><Inline nodes={node.children} /></em>;
          case 'inlineCode':
            return <code key={i} className="md4ai-inline-code">{node.value}</code>;
          case 'link':
            return (
              <a key={i} href={node.href} className="md4ai-link" target="_blank" rel="noreferrer">
                <Inline nodes={node.children} />
              </a>
            );
          case 'image':
            return <img key={i} src={node.src} alt={node.alt} className="md4ai-img" />;
          case 'break':
            return <br key={i} />;
          case 'bridge': {
            // Partial bridge: data still streaming. Show skeleton unless disabled
            // globally (skeletons=false) or per-bridge (bridge.skeleton=false).
            if (node.partial) {
              const bridge = bridges.find((b) => b.marker === node.marker);
              if (skeletons && bridge?.skeleton !== false) {
                return <BridgeSkeleton key={`p-${i}`} marker={node.marker} />;
              }
              return null;
            }
            const bridge = bridges.find((b) => b.marker === node.marker);
            if (!bridge) return <span key={`b-${i}`} className="md4ai-bridge--unknown">@{node.marker}[{node.raw}]</span>;
            try {
              return <React.Fragment key={`b-${i}`}>{bridge.render(node.data, bridgeCtx)}</React.Fragment>;
            } catch {
              return <span key={`b-${i}`} className="md4ai-bridge--unknown">@{node.marker}[{node.raw}]</span>;
            }
          }
          default:
            return null;
        }
      })}
    </>
  );
}
