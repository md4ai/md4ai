import React, { useContext } from 'react';
import type { InlineNode } from '../../../types.js';
import { RenderContext } from '../context.js';

interface Props {
  nodes: InlineNode[];
}

export function Inline({ nodes }: Props) {
  const { bridges, bridgeCtx } = useContext(RenderContext);

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
            const bridge = bridges.find((b) => b.marker === node.marker);
            if (!bridge) return <span key={i} className="md4ai-bridge--unknown">@{node.marker}[{node.raw}]</span>;
            try {
              return <React.Fragment key={i}>{bridge.render(node.data, bridgeCtx)}</React.Fragment>;
            } catch {
              return <span key={i} className="md4ai-bridge--unknown">@{node.marker}[{node.raw}]</span>;
            }
          }
          default:
            return null;
        }
      })}
    </>
  );
}
