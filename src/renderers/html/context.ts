import { createContext, useContext } from 'react';
import type { ComponentOverrides, RenderContentOptions } from '../../types.js';
import type { BridgeDefinition, BridgeRenderCtx } from '../../bridge.js';
import type { Md4aiDebugHook } from '../../debug.js';

export interface RenderCtx {
  className?: string;
  theme?: RenderContentOptions['theme'];
  components: ComponentOverrides;
  highlight?: RenderContentOptions['highlight'];
  bridges: BridgeDefinition[];
  bridgeCtx: BridgeRenderCtx;
  skeletons: boolean;
  debug: Md4aiDebugHook;
}

export const RenderContext = createContext<RenderCtx>({
  components: {},
  bridges: [],
  bridgeCtx: { query: () => undefined, emit: () => {} },
  skeletons: true,
  debug: { enabled: false, emit: () => {} },
});

export const useRenderCtx = () => useContext(RenderContext);
