import { DEFAULT_CONTENT } from './defaultContent.js';

const PRODUCT_ROADMAP_CONTENT = `# H2 Product Roadmap Review

Here is the current roadmap state for the next two quarters, including delivery confidence, platform work, and launch sequencing.

## Portfolio Snapshot

::kpi{label="Roadmap Themes" value="4" change="+1" period="H2"}
::kpi{label="Committed Initiatives" value="11" change="+3" period="Quarter"}
::kpi{label="Launch Confidence" value="78%" change="-4 pts" period="Past 30 days"}
::kpi{label="Critical Risks" value="3" change="+1" period="Current"}

## Theme Allocation

| Theme | Quarter | Owner | Scope | Confidence | Status |
| --- | --- | --- | --- | --- | --- |
| AI Workspace | Q3 | Product + AI | Core editor, copilots, actions | 82% | On track |
| Reporting Foundations | Q3 | Platform | Events, schemas, dashboard APIs | 76% | Active |
| Mobile Parity | Q4 | Product | Navigation, notifications, offline views | 61% | At risk |
| Admin Controls | Q4 | Platform | Roles, audit logs, policy guardrails | 84% | Healthy |
| Total | H2 | Product Org | 4 strategic themes | 78% | Stable |

## Roadmap Timeline

\`\`\`timeline
Reporting schema freeze | done
AI workspace beta | active | Early design partner rollout starts this month
Dashboard primitives | active | Shared chart and export APIs are in development
Mobile parity recovery plan | planned
Admin controls GA | planned
\`\`\`

## Execution Plan

\`\`\`steps
- [done] Finalize H2 strategic themes
  Leadership alignment is complete and the roadmap narrative is approved.
- [active] Ship AI workspace beta to design partners
  Assistant actions, composer upgrades, and workspace memory are in active development.
- [active] Build reporting foundations
  Dashboard APIs, export jobs, and metric schema cleanup are underway.
- [planned] Recover mobile parity timeline
  Team needs a dependency review across design systems and backend APIs.
- [planned] Launch admin controls GA
\`\`\`

::button[Export Roadmap Brief]{href="#" variant="primary"}
::button[Open Delivery Review]{href="#" variant="secondary"}
`;

const INCIDENT_REVIEW_CONTENT = `# Incident Review: Export Jobs Degradation

This is the post-incident summary for the export and reporting outage on April 12.

## Severity Snapshot

::kpi{label="Incident Duration" value="47 min" change="-18 min" period="vs prior Sev-1"}
::kpi{label="Impacted Workspaces" value="214" change="+214" period="Window"}
::kpi{label="Failed Export Jobs" value="1,832" change="+1,832" period="Incident"}
::kpi{label="Customer Credits" value="$6.4k" change="+$6.4k" period="Issued"}

## Timeline

\`\`\`timeline
Alert fired | done | Error rate crossed the Sev-1 threshold at 14:07 UTC
Initial mitigation | done | Export workers were scaled up and retries were disabled
Root cause confirmed | active | Queue starvation was traced to an unbounded retry loop
Permanent fix | planned
Customer follow-up | planned
\`\`\`

## Recovery Plan

\`\`\`steps
- [done] Triage the alert and confirm customer impact
- [done] Disable automatic retries on export failures
- [active] Ship queue isolation for export and notification workers
  This prevents heavy export traffic from starving other background jobs.
- [planned] Add retry budgets and backoff caps
- [planned] Publish the customer-facing RCA
\`\`\`

## Impact By Job Type

| Job Type | Failed Jobs | Recovery Status | Customer Impact |
| --- | --- | --- | --- |
| PDF Export | 1,104 | Recovered | High |
| CSV Export | 498 | Recovered | Medium |
| Scheduled Email | 230 | Recovered | Medium |
| Total | 1,832 | Stable | High |
`;

export const SAMPLE_CONTENTS = [
  {
    id: 'business-review',
    label: 'Business Review',
    description: 'Revenue, charts, KPIs, tables, and actions.',
    content: DEFAULT_CONTENT,
  },
  {
    id: 'product-roadmap',
    label: 'Product Roadmap',
    description: 'Roadmap planning with steps, timelines, and ownership.',
    content: PRODUCT_ROADMAP_CONTENT,
  },
  {
    id: 'incident-review',
    label: 'Incident Review',
    description: 'Postmortem-style content with severity and recovery steps.',
    content: INCIDENT_REVIEW_CONTENT,
  },
] as const;
