import { createContext, useContext } from 'react';
import type { ComponentOverrides, RenderHTMLOptions } from '../../types.js';
import type { BridgeDefinition, BridgeRenderCtx } from '../../bridge.js';

export interface RenderCtx {
  className?: string;
  theme?: RenderHTMLOptions['theme'];
  components: ComponentOverrides;
  highlight?: RenderHTMLOptions['highlight'];
  bridges: BridgeDefinition[];
  bridgeCtx: BridgeRenderCtx;
}

export const RenderContext = createContext<RenderCtx>({
  components: {},
  bridges: [],
  bridgeCtx: { query: () => undefined, emit: () => {} },
});

export const useRenderCtx = () => useContext(RenderContext);
