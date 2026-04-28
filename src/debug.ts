export type Md4aiDebugStage =
  | 'markdown.parse.start'
  | 'markdown.parse.end'
  | 'bridge.detected'
  | 'bridge.parse.success'
  | 'bridge.parse.fail'
  | 'bridge.fallback.used'
  | 'bridge.render.success'
  | 'bridge.render.fail'
  | 'store.query.success'
  | 'store.query.fail'
  | 'store.emit.success'
  | 'store.emit.fail';

export type Md4aiDebugCode =
  | 'E_BRIDGE_PARSE'
  | 'E_SCHEMA_FIELD_MISSING'
  | 'E_SCHEMA_ENUM_INVALID'
  | 'E_SCHEMA_NUMBER_INVALID'
  | 'E_SCHEMA_UNKNOWN_FIELD'
  | 'E_SCHEMA_TOO_MANY_POSITIONAL'
  | 'E_STORE_QUERY_FAILED'
  | 'E_STORE_EMIT_FAILED'
  | 'E_RENDER_THROW';

export interface Md4aiDebugLocation {
  line: number;
  column: number;
  offset: number;
}

export interface Md4aiDebugEvent {
  stage: Md4aiDebugStage;
  timestamp: number;
  durationMs?: number;
  marker?: string;
  raw?: string;
  code?: Md4aiDebugCode;
  message?: string;
  location?: Md4aiDebugLocation;
  detail?: Record<string, unknown>;
  error?: unknown;
}

export interface Md4aiDebugOptions {
  enabled?: boolean;
  onEvent?: (event: Md4aiDebugEvent) => void;
}

export interface Md4aiDebugHook {
  enabled: boolean;
  emit: (event: Omit<Md4aiDebugEvent, 'timestamp'>) => void;
}

export interface Md4aiInspectorStore {
  onEvent: (event: Md4aiDebugEvent) => void;
  getEvents: () => Md4aiDebugEvent[];
  clear: () => void;
  subscribe: (listener: (events: Md4aiDebugEvent[]) => void) => () => void;
}

export function createDebugHook(
  debug?: boolean | Md4aiDebugOptions,
  fallbackHandler?: (event: Md4aiDebugEvent) => void,
): Md4aiDebugHook {
  if (!debug) {
    return { enabled: false, emit: () => {} };
  }

  const options: Md4aiDebugOptions = typeof debug === 'boolean' ? { enabled: debug } : debug;
  const enabled = options.enabled !== false;
  const onEvent = options.onEvent ?? fallbackHandler;

  if (!enabled || !onEvent) {
    return { enabled, emit: () => {} };
  }

  return {
    enabled,
    emit: (event) => onEvent({ ...event, timestamp: Date.now() }),
  };
}

export function createInspectorStore(maxEvents = 500): Md4aiInspectorStore {
  let events: Md4aiDebugEvent[] = [];
  const listeners = new Set<(events: Md4aiDebugEvent[]) => void>();

  const notify = () => {
    const snapshot = events.slice();
    listeners.forEach((listener) => listener(snapshot));
  };

  return {
    onEvent: (event) => {
      events.push(event);
      if (events.length > maxEvents) {
        events = events.slice(events.length - maxEvents);
      }
      notify();
    },
    getEvents: () => events.slice(),
    clear: () => {
      events = [];
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      listener(events.slice());
      return () => listeners.delete(listener);
    },
  };
}

export function classifyBridgeParseError(error: unknown): Md4aiDebugCode {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('Missing required field')) return 'E_SCHEMA_FIELD_MISSING';
  if (message.includes('Invalid enum value')) return 'E_SCHEMA_ENUM_INVALID';
  if (message.includes('Invalid number')) return 'E_SCHEMA_NUMBER_INVALID';
  if (message.includes('Unknown field')) return 'E_SCHEMA_UNKNOWN_FIELD';
  if (message.includes('Too many positional values')) return 'E_SCHEMA_TOO_MANY_POSITIONAL';
  return 'E_BRIDGE_PARSE';
}
