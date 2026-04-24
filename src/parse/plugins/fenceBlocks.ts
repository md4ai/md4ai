import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';
import type { Plugin } from 'unified';

const RICH_LANGS = new Set(['chart', 'video', 'layout', 'steps', 'timeline']);

type StepStatus = 'done' | 'active' | 'planned' | 'blocked';
type StepPresentation = 'steps' | 'timeline';

type ParsedStep = {
  title: string;
  status: StepStatus;
  description?: string;
};

const STEP_STATUS_ALIASES: Record<string, StepStatus> = {
  done: 'done',
  complete: 'done',
  completed: 'done',
  shipped: 'done',
  active: 'active',
  current: 'active',
  doing: 'active',
  progress: 'active',
  'in progress': 'active',
  'in-progress': 'active',
  planned: 'planned',
  pending: 'planned',
  todo: 'planned',
  upcoming: 'planned',
  next: 'planned',
  blocked: 'blocked',
  stuck: 'blocked',
  waiting: 'blocked',
  paused: 'blocked',
};

function normalizeStepStatus(raw?: string | null): StepStatus | null {
  if (!raw) return null;
  return STEP_STATUS_ALIASES[raw.trim().toLowerCase()] ?? null;
}

function parseStepLine(value: string): ParsedStep | null {
  const clean = value
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .trim();

  if (!clean) return null;

  const bracketPrefix = clean.match(/^\[(?<status>[^\]]+)\]\s*(?<title>.+)$/);
  if (bracketPrefix?.groups) {
    return {
      title: bracketPrefix.groups.title.trim(),
      status: normalizeStepStatus(bracketPrefix.groups.status) ?? 'planned',
    };
  }

  const bracketSuffix = clean.match(/^(?<title>.+?)\s+\[(?<status>[^\]]+)\]$/);
  if (bracketSuffix?.groups) {
    return {
      title: bracketSuffix.groups.title.trim(),
      status: normalizeStepStatus(bracketSuffix.groups.status) ?? 'planned',
    };
  }

  const pipeParts = clean.split('|').map((part) => part.trim()).filter(Boolean);
  if (pipeParts.length >= 2) {
    const leadingStatus = normalizeStepStatus(pipeParts[0]);
    if (leadingStatus) {
      const description = pipeParts.slice(2).join(' | ') || undefined;
      return {
        title: pipeParts[1],
        status: leadingStatus,
        ...(description ? { description } : {}),
      };
    }

    const middleStatus = normalizeStepStatus(pipeParts[1]);
    if (middleStatus) {
      const description = pipeParts.slice(2).join(' | ') || undefined;
      return {
        title: pipeParts[0],
        status: middleStatus,
        ...(description ? { description } : {}),
      };
    }
  }

  const colonIndex = clean.indexOf(':');
  if (colonIndex !== -1) {
    const left = clean.slice(0, colonIndex).trim();
    const right = clean.slice(colonIndex + 1).trim();
    const leftStatus = normalizeStepStatus(left);
    if (leftStatus && right) return { title: right, status: leftStatus };
    const rightStatus = normalizeStepStatus(right);
    if (rightStatus && left) return { title: left, status: rightStatus };
  }

  return { title: clean, status: 'planned' };
}

function parseSteps(value: string, presentation: StepPresentation) {
  const items: ParsedStep[] = [];
  let current: ParsedStep | null = null;

  const pushCurrent = () => {
    if (!current) return;
    current.title = current.title.trim();
    if (current.description) current.description = current.description.trim();
    if (current.title) items.push(current);
    current = null;
  };

  for (const line of value.replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isContinuation = current && /^\s+/.test(line) && !/^(\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(line);
    if (isContinuation && current) {
      current.description = current.description
        ? `${current.description}\n${trimmed}`
        : trimmed;
      continue;
    }

    pushCurrent();
    current = parseStepLine(trimmed);
  }

  pushCurrent();
  return { items, presentation };
}

const plugin: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'code', (node: Code, index, parent) => {
    const lang = (node.lang ?? '').toLowerCase().split(/\s/)[0];
    if (!RICH_LANGS.has(lang)) return;

    let richNode: unknown;

    if (lang === 'chart') {
      try {
        const data = JSON.parse(node.value);
        richNode = { type: 'chart', data: { chartType: data.type ?? 'bar', ...data } };
      } catch {
        // Partial/invalid JSON during streaming — emit a pending placeholder
        richNode = { type: 'chart', data: null };
      }
    } else if (lang === 'video') {
      richNode = { type: 'video', data: { src: node.value.trim() } };
    } else if (lang === 'layout') {
      const metaStr = node.meta ?? '';
      const colMatch = metaStr.match(/columns=(\d+)/);
      const columns = colMatch ? parseInt(colMatch[1], 10) : 2;
      const sections = node.value.split(/^---$/m).map((s) => s.trim());
      const sectionParser = unified().use(remarkParse).use(remarkGfm);
      const sectionTrees = sections.map((s) => sectionParser.parse(s).children);
      richNode = { type: 'layout', data: { columns, sectionTrees } };
    } else if (lang === 'steps' || lang === 'timeline') {
      richNode = { type: 'steps', data: parseSteps(node.value, lang) };
    }

    if (richNode && parent && index != null) {
      (parent.children as unknown[])[index] = richNode;
    }
  });
};

export default plugin;
