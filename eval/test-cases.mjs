/**
 * Test scenarios for md4ai prompt evaluation.
 *
 * Each case has:
 *   userPrompt        — what the user asks
 *   topics            — getPrompt() builtins relevant to this case
 *   expectedComponents — IR node types we expect in the output
 *   goldenExample     — reference md4ai markdown (the "ideal" output)
 *   jsonEquivalent    — equivalent JSON for token comparison
 */
export const TEST_CASES = [
  // ── 1. Revenue Dashboard ────────────────────────────────────────────
  {
    id: 'revenue-dashboard',
    name: 'Revenue Dashboard',
    userPrompt:
      'Summarize Q2 revenue performance. Show headline KPI numbers for Total Revenue ($2.4M, +14% QoQ), ' +
      'East ($680k, +22%), West ($590k, +9%), South ($420k, -3%), North ($710k, +18%). ' +
      'Include a bar chart of regional revenue, a table comparing Q1 vs Q2 per region, ' +
      'and a warning callout about the South region risk.',
    topics: ['kpi', 'charts', 'tables', 'callouts'],
    expectedComponents: ['kpi', 'chart', 'table', 'callout'],
    goldenExample: `## Q2 Revenue Performance

@kpi["Total Revenue", "$2.4M", change: "+14%", period: "QoQ"]
@kpi["East", "$680k", change: "+22%", period: "QoQ"]
@kpi["West", "$590k", change: "+9%", period: "QoQ"]
@kpi["South", "$420k", change: "-3%", period: "QoQ"]
@kpi["North", "$710k", change: "+18%", period: "QoQ"]

\`\`\`chart
{
  "type": "bar",
  "labels": ["East", "West", "South", "North"],
  "datasets": [
    { "label": "Q1", "data": [557, 541, 433, 601] },
    { "label": "Q2", "data": [680, 590, 420, 710] }
  ]
}
\`\`\`

| Region | Q1 | Q2 | Change |
| --- | --- | --- | --- |
| East | $557k | $680k | +22% |
| West | $541k | $590k | +9% |
| South | $433k | $420k | -3% |
| North | $601k | $710k | +18% |

> [!WARNING]
> South region is down 3% QoQ — pipeline review recommended before Q3.`,
    jsonEquivalent: JSON.stringify({
      type: 'dashboard', title: 'Q2 Revenue',
      metrics: [
        { label: 'Total Revenue', value: '$2.4M', change: '+14%', period: 'QoQ' },
        { label: 'East', value: '$680k', change: '+22%', period: 'QoQ' },
        { label: 'West', value: '$590k', change: '+9%', period: 'QoQ' },
        { label: 'South', value: '$420k', change: '-3%', period: 'QoQ' },
        { label: 'North', value: '$710k', change: '+18%', period: 'QoQ' },
      ],
      chart: { type: 'bar', labels: ['East', 'West', 'South', 'North'], datasets: [{ label: 'Q1', data: [557, 541, 433, 601] }, { label: 'Q2', data: [680, 590, 420, 710] }] },
      table: { head: ['Region', 'Q1', 'Q2', 'Change'], rows: [['East', '$557k', '$680k', '+22%'], ['West', '$541k', '$590k', '+9%'], ['South', '$433k', '$420k', '-3%'], ['North', '$601k', '$710k', '+18%']] },
      callout: { variant: 'warning', message: 'South is down 3%.' },
    }),
  },

  // ── 2. Incident Report ──────────────────────────────────────────────
  {
    id: 'incident-report',
    name: 'Incident Report',
    userPrompt:
      'Write a P1 incident report for a payments service outage from 14:32 to 16:08 UTC. ' +
      'Root cause: bad deploy of v2.4.1. Show the incident timeline as a steps/timeline block with statuses. ' +
      'Include a danger callout (8,200 failed transactions). ' +
      'Add a remediation table: Step | Owner | Status with 4 items.',
    topics: ['steps', 'callouts', 'tables'],
    expectedComponents: ['steps', 'callout', 'table'],
    goldenExample: `## P1 Incident — Payments Service Outage

> [!DANGER]
> **8,200 failed transactions** — customer-facing impact from 14:32 to 16:08 UTC.

\`\`\`timeline
- [done] 14:32 — Alert fired: PagerDuty triggered on error rate spike
- [done] 14:40 — Incident declared: War room opened
- [done] 14:55 — Root cause identified: Bad deploy v2.4.1
- [done] 15:30 — Rollback deployed: v2.4.0 restored
- [done] 16:08 — All-clear: Error rate returned to normal
\`\`\`

| Step | Owner | Status |
| --- | --- | --- |
| Deploy gate review | Platform | In progress |
| Rollback runbook update | SRE | Planned |
| Customer communications | Support | Done |
| Post-mortem document | All | Planned |`,
    jsonEquivalent: JSON.stringify({
      type: 'incident', severity: 'P1',
      callout: { variant: 'danger', message: '8,200 failed transactions.' },
      timeline: [
        { status: 'done', title: '14:32 — Alert fired' },
        { status: 'done', title: '14:40 — Incident declared' },
        { status: 'done', title: '14:55 — Root cause found: v2.4.1' },
        { status: 'done', title: '15:30 — Rollback deployed' },
        { status: 'done', title: '16:08 — All-clear' },
      ],
      remediation: { head: ['Step', 'Owner', 'Status'], rows: [['Deploy gate review', 'Platform', 'In progress'], ['Rollback runbook', 'SRE', 'Planned'], ['Customer comms', 'Support', 'Done'], ['Post-mortem', 'All', 'Planned']] },
    }),
  },

  // ── 3. Product Roadmap ──────────────────────────────────────────────
  {
    id: 'product-roadmap',
    name: 'Product Roadmap',
    userPrompt:
      'Give a product roadmap for H2. Timeline: Onboarding v2 (done), Agent Inbox (active, July), ' +
      'Mobile parity (planned, August), API v3 (planned, September), Analytics 2.0 (blocked, waiting on data team). ' +
      'Show two summary cards side by side: Shipped items and Risks.',
    topics: ['steps', 'cards', 'layout'],
    expectedComponents: ['steps', 'card', 'layout'],
    goldenExample: `## H2 Product Roadmap

\`\`\`timeline
- [done] Onboarding v2 — shipped and live
- [active] Agent Inbox — shipping July 2025
- [planned] Mobile parity — August 2025
- [planned] API v3 — September 2025
- [blocked] Analytics 2.0 — waiting on data team dependency
\`\`\`

\`\`\`layout columns=2
### Shipped
- Onboarding v2 is live and ramping

---

### Risks
- Analytics 2.0 is blocked by an external dependency on the data team
\`\`\``,
    jsonEquivalent: JSON.stringify({
      type: 'roadmap', period: 'H2',
      timeline: [{ status: 'done', title: 'Onboarding v2' }, { status: 'active', title: 'Agent Inbox', eta: 'July' }, { status: 'planned', title: 'Mobile parity', eta: 'Aug' }, { status: 'planned', title: 'API v3', eta: 'Sep' }, { status: 'blocked', title: 'Analytics 2.0' }],
      layout: { columns: 2, cards: [{ title: 'Shipped', body: 'Onboarding v2 live' }, { title: 'Risks', body: 'Analytics 2.0 blocked' }] },
    }),
  },

  // ── 4. Data Comparison ──────────────────────────────────────────────
  {
    id: 'data-comparison',
    name: 'Data Comparison',
    userPrompt:
      'Compare three ML model variants: ModelA (accuracy 94.2%, latency 42ms, size 1.2GB), ' +
      'ModelB (accuracy 91.8%, latency 18ms, size 340MB), ModelC (accuracy 96.1%, latency 120ms, size 4.8GB). ' +
      'KPIs for best accuracy and best latency. Full comparison table. Note callout recommending ModelB for production.',
    topics: ['kpi', 'tables', 'callouts'],
    expectedComponents: ['kpi', 'table', 'callout'],
    goldenExample: `## ML Model Comparison

@kpi["Best Accuracy", "96.1%", change: "ModelC", period: "eval set"]
@kpi["Best Latency", "18ms", change: "ModelB", period: "p50"]

| Model | Accuracy | Latency | Size |
| --- | --- | --- | --- |
| ModelA | 94.2% | 42ms | 1.2GB |
| ModelB | 91.8% | 18ms | 340MB |
| ModelC | 96.1% | 120ms | 4.8GB |

> [!NOTE]
> **Recommendation:** Deploy ModelB in production — best latency and smallest footprint. Reserve ModelC for offline batch jobs where accuracy is critical.`,
    jsonEquivalent: JSON.stringify({
      kpis: [{ label: 'Best Accuracy', value: '96.1%', change: 'ModelC' }, { label: 'Best Latency', value: '18ms', change: 'ModelB' }],
      table: { head: ['Model', 'Accuracy', 'Latency', 'Size'], rows: [['ModelA', '94.2%', '42ms', '1.2GB'], ['ModelB', '91.8%', '18ms', '340MB'], ['ModelC', '96.1%', '120ms', '4.8GB']] },
      callout: { variant: 'note', message: 'Recommend ModelB for production.' },
    }),
  },

  // ── 5. Action Required ──────────────────────────────────────────────
  {
    id: 'action-required',
    name: 'Action Required',
    userPrompt:
      'Tell the user their trial expires in 3 days. Show a warning callout. ' +
      'Multi-column layout: left "What you keep" (3 bullets), right "What you lose" (3 bullets). ' +
      'End with Upgrade Now (primary) and Talk to Sales (secondary) buttons.',
    topics: ['callouts', 'layout', 'buttons'],
    expectedComponents: ['callout', 'layout', 'button'],
    goldenExample: `> [!WARNING]
> Your trial expires in **3 days**. Upgrade now to keep access to all features.

\`\`\`layout columns=2
### What you keep
- Your data and history
- All integrations
- API access

---

### What you lose
- Team seats beyond 1
- Priority support
- Custom bridge components
\`\`\`

@button["Upgrade Now", href: "/upgrade", variant: "primary"]
@button["Talk to Sales", href: "/sales", variant: "secondary"]`,
    jsonEquivalent: JSON.stringify({
      callout: { variant: 'warning', message: 'Trial expires in 3 days.' },
      layout: { columns: 2, sections: [{ title: 'What you keep', items: ['Your data', 'Integrations', 'API access'] }, { title: 'What you lose', items: ['Team seats', 'Priority support', 'Custom bridges'] }] },
      actions: [{ label: 'Upgrade Now', variant: 'primary', href: '/upgrade' }, { label: 'Talk to Sales', variant: 'secondary', href: '/sales' }],
    }),
  },

  // ── 6. Support Case Summary ─────────────────────────────────────────
  {
    id: 'support-case',
    name: 'Support Case Summary',
    userPrompt:
      'Summarize a support case: Customer "Acme Corp" reported slow API responses since yesterday. ' +
      'Affected endpoint: POST /v2/render. Avg latency 4200ms vs SLA of 500ms. ' +
      'Show KPIs for current vs SLA latency. Steps taken so far: ticket opened (done), ' +
      'logs reviewed (done), engineering escalated (active), fix in progress (planned). ' +
      'Add a tip callout about workaround: use the v1 endpoint temporarily.',
    topics: ['kpi', 'steps', 'callouts'],
    expectedComponents: ['kpi', 'steps', 'callout'],
    goldenExample: `## Support Case — Acme Corp API Latency

@kpi["Current Latency", "4,200ms", change: "+740%", period: "vs SLA"]
@kpi["SLA Target", "500ms", change: "breached", period: "p95"]

\`\`\`steps
- [done] Ticket opened and acknowledged
- [done] Server logs reviewed — no infra anomalies found
- [active] Escalated to engineering team
- [planned] Fix deployment scheduled
\`\`\`

> [!TIP]
> **Workaround:** Use the \`POST /v1/render\` endpoint while the fix is in progress — same response format, lower latency.`,
    jsonEquivalent: JSON.stringify({
      kpis: [{ label: 'Current Latency', value: '4200ms', change: '+740%' }, { label: 'SLA Target', value: '500ms', change: 'breached' }],
      steps: [{ status: 'done', title: 'Ticket opened' }, { status: 'done', title: 'Logs reviewed' }, { status: 'active', title: 'Engineering escalated' }, { status: 'planned', title: 'Fix in progress' }],
      callout: { variant: 'tip', message: 'Use v1 endpoint as workaround.' },
    }),
  },

  // ── 7. A/B Test Results ─────────────────────────────────────────────
  {
    id: 'ab-test-results',
    name: 'A/B Test Results',
    userPrompt:
      'Report A/B test results for a checkout flow redesign. ' +
      'Control: 3.2% conversion, $42 avg order, 68% completion. ' +
      'Variant: 4.1% conversion (+28%), $47 avg order (+12%), 74% completion (+9%). ' +
      'Show KPIs for the key uplifts. Full results table. A note callout: test is statistically significant (p<0.01, n=24,000).',
    topics: ['kpi', 'tables', 'callouts'],
    expectedComponents: ['kpi', 'table', 'callout'],
    goldenExample: `## Checkout Redesign — A/B Test Results

@kpi["Conversion Uplift", "+28%", change: "3.2% → 4.1%", period: "test period"]
@kpi["Avg Order Value", "+12%", change: "$42 → $47", period: "test period"]
@kpi["Checkout Completion", "+9%", change: "68% → 74%", period: "test period"]

| Metric | Control | Variant | Delta |
| --- | --- | --- | --- |
| Conversion rate | 3.2% | 4.1% | +28% |
| Avg order value | $42 | $47 | +12% |
| Checkout completion | 68% | 74% | +9% |

> [!NOTE]
> Results are statistically significant: p < 0.01, sample size n = 24,000. Safe to ship the variant.`,
    jsonEquivalent: JSON.stringify({
      kpis: [{ label: 'Conversion Uplift', value: '+28%' }, { label: 'AOV', value: '+12%' }, { label: 'Completion', value: '+9%' }],
      table: { head: ['Metric', 'Control', 'Variant', 'Delta'], rows: [['Conversion', '3.2%', '4.1%', '+28%'], ['AOV', '$42', '$47', '+12%'], ['Completion', '68%', '74%', '+9%']] },
      callout: { variant: 'note', message: 'Statistically significant p<0.01 n=24000.' },
    }),
  },

  // ── 8. Onboarding Guide ─────────────────────────────────────────────
  {
    id: 'onboarding-guide',
    name: 'Onboarding Guide',
    userPrompt:
      'Write a 4-step onboarding guide for a new user: ' +
      '1. Create account (done), 2. Connect your data source (active), ' +
      '3. Build first dashboard (planned), 4. Invite team members (planned). ' +
      'Show progress as steps. Then add a tip callout about keyboard shortcuts. ' +
      'End with a "Go to Dashboard" primary button.',
    topics: ['steps', 'callouts', 'buttons'],
    expectedComponents: ['steps', 'callout', 'button'],
    goldenExample: `## Getting Started

\`\`\`steps
- [done] Create your account
- [active] Connect your data source
- [planned] Build your first dashboard
- [planned] Invite team members
\`\`\`

> [!TIP]
> **Pro tip:** Press \`Cmd+K\` to open the command palette and navigate anywhere without leaving your keyboard.

@button["Go to Dashboard", href: "/dashboard", variant: "primary"]`,
    jsonEquivalent: JSON.stringify({
      steps: [{ status: 'done', title: 'Create account' }, { status: 'active', title: 'Connect data source' }, { status: 'planned', title: 'Build dashboard' }, { status: 'planned', title: 'Invite team' }],
      callout: { variant: 'tip', message: 'Press Cmd+K for command palette.' },
      button: { label: 'Go to Dashboard', variant: 'primary', href: '/dashboard' },
    }),
  },

  // ── 9. Security Alert ───────────────────────────────────────────────
  {
    id: 'security-alert',
    name: 'Security Alert',
    userPrompt:
      'Alert the user about a security event: 3 failed login attempts from IP 192.168.1.45 ' +
      '(location: unknown) in the last 10 minutes. ' +
      'Show a danger callout. Then a table: Time | IP | Location | Result for 3 attempts. ' +
      'Add two action buttons: Lock Account (primary) and Dismiss (secondary).',
    topics: ['callouts', 'tables', 'buttons'],
    expectedComponents: ['callout', 'table', 'button'],
    goldenExample: `> [!DANGER]
> **Security Alert:** 3 failed login attempts from an unknown IP in the last 10 minutes.

| Time | IP Address | Location | Result |
| --- | --- | --- | --- |
| 14:03 UTC | 192.168.1.45 | Unknown | Failed |
| 14:06 UTC | 192.168.1.45 | Unknown | Failed |
| 14:09 UTC | 192.168.1.45 | Unknown | Failed |

@button["Lock Account", href: "/security/lock", variant: "primary"]
@button["Dismiss", href: "/security/dismiss", variant: "secondary"]`,
    jsonEquivalent: JSON.stringify({
      callout: { variant: 'danger', message: '3 failed logins from 192.168.1.45.' },
      table: { head: ['Time', 'IP', 'Location', 'Result'], rows: [['14:03', '192.168.1.45', 'Unknown', 'Failed'], ['14:06', '192.168.1.45', 'Unknown', 'Failed'], ['14:09', '192.168.1.45', 'Unknown', 'Failed']] },
      actions: [{ label: 'Lock Account', variant: 'primary' }, { label: 'Dismiss', variant: 'secondary' }],
    }),
  },

  // ── 10. Feature Usage Report ────────────────────────────────────────
  {
    id: 'feature-usage',
    name: 'Feature Usage Report',
    userPrompt:
      'Monthly feature usage report. Key metrics: DAU 12,400 (+8%), Feature adoption 67% (+5pp), ' +
      'API calls 2.1M (+22%). Bar chart of DAU over last 6 months: Jan 9k, Feb 9.8k, Mar 10.5k, Apr 11k, May 11.8k, Jun 12.4k. ' +
      'Table of top 5 features by usage this month.',
    topics: ['kpi', 'charts', 'tables'],
    expectedComponents: ['kpi', 'chart', 'table'],
    goldenExample: `## June Feature Usage Report

@kpi["DAU", "12,400", change: "+8%", period: "MoM"]
@kpi["Feature Adoption", "67%", change: "+5pp", period: "MoM"]
@kpi["API Calls", "2.1M", change: "+22%", period: "MoM"]

\`\`\`chart
{
  "type": "bar",
  "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  "datasets": [{ "label": "DAU", "data": [9000, 9800, 10500, 11000, 11800, 12400] }]
}
\`\`\`

| Feature | Users | Usage % | Change |
| --- | --- | --- | --- |
| Dashboard builder | 8,200 | 66% | +12% |
| Data connectors | 7,100 | 57% | +9% |
| Report scheduler | 5,400 | 44% | +18% |
| Team sharing | 4,800 | 39% | +6% |
| API explorer | 3,200 | 26% | +31% |`,
    jsonEquivalent: JSON.stringify({
      kpis: [{ label: 'DAU', value: '12,400', change: '+8%' }, { label: 'Adoption', value: '67%', change: '+5pp' }, { label: 'API Calls', value: '2.1M', change: '+22%' }],
      chart: { type: 'bar', labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], datasets: [{ label: 'DAU', data: [9000, 9800, 10500, 11000, 11800, 12400] }] },
      table: { head: ['Feature', 'Users', 'Usage %', 'Change'], rows: [['Dashboard builder', '8,200', '66%', '+12%'], ['Data connectors', '7,100', '57%', '+9%'], ['Report scheduler', '5,400', '44%', '+18%'], ['Team sharing', '4,800', '39%', '+6%'], ['API explorer', '3,200', '26%', '+31%']] },
    }),
  },

  // ── 11. Pipeline Health ─────────────────────────────────────────────
  {
    id: 'pipeline-health',
    name: 'Pipeline Health',
    userPrompt:
      'CI/CD pipeline health summary. KPIs: Build success rate 94.2% (-1.8pp), ' +
      'Avg build time 4m 12s (+0:34), Deploy frequency 8.3/day (+2.1). ' +
      'Steps for the last deploy: build (done), unit tests (done), integration tests (done, 2 flakes), ' +
      'staging deploy (done), smoke tests (active), production deploy (planned). ' +
      'Warning callout: 2 flaky tests need investigation.',
    topics: ['kpi', 'steps', 'callouts'],
    expectedComponents: ['kpi', 'steps', 'callout'],
    goldenExample: `## CI/CD Pipeline Health

@kpi["Build Success Rate", "94.2%", change: "-1.8pp", period: "7d"]
@kpi["Avg Build Time", "4m 12s", change: "+0:34", period: "7d"]
@kpi["Deploy Frequency", "8.3/day", change: "+2.1", period: "7d"]

\`\`\`steps
- [done] Build — passed in 1m 42s
- [done] Unit tests — 1,847 passed
- [done] Integration tests — 2 flakes detected
- [done] Staging deploy — successful
- [active] Smoke tests — running
- [planned] Production deploy
\`\`\`

> [!WARNING]
> 2 flaky integration tests detected in this run. Investigate \`AuthMiddlewareTest\` and \`WebhookRetryTest\` before the next release.`,
    jsonEquivalent: JSON.stringify({
      kpis: [{ label: 'Build success', value: '94.2%', change: '-1.8pp' }, { label: 'Build time', value: '4m 12s', change: '+0:34' }, { label: 'Deploy freq', value: '8.3/day', change: '+2.1' }],
      steps: [{ status: 'done', title: 'Build' }, { status: 'done', title: 'Unit tests' }, { status: 'done', title: 'Integration tests - 2 flakes' }, { status: 'done', title: 'Staging deploy' }, { status: 'active', title: 'Smoke tests' }, { status: 'planned', title: 'Production deploy' }],
      callout: { variant: 'warning', message: '2 flaky tests need investigation.' },
    }),
  },

  // ── 12. Cost Report ─────────────────────────────────────────────────
  {
    id: 'cost-report',
    name: 'Cloud Cost Report',
    userPrompt:
      'Cloud cost report for June. Total spend $84,200 (+12% MoM). ' +
      'Breakdown: Compute $41k (49%), Storage $18k (21%), Network $14k (17%), Other $11k (13%). ' +
      'Show a pie chart of cost distribution. Top 3 cost drivers table. ' +
      'Info callout: Reserved instance coverage is 61% — increasing to 75% would save ~$9k/month.',
    topics: ['kpi', 'charts', 'tables', 'callouts'],
    expectedComponents: ['kpi', 'chart', 'table', 'callout'],
    goldenExample: `## June Cloud Cost Report

@kpi["Total Spend", "$84,200", change: "+12%", period: "MoM"]
@kpi["Reserved Coverage", "61%", change: "-", period: "current"]

\`\`\`chart
{
  "type": "pie",
  "labels": ["Compute", "Storage", "Network", "Other"],
  "datasets": [{ "data": [41000, 18000, 14000, 11000] }]
}
\`\`\`

| Service | Cost | % of Total | Change |
| --- | --- | --- | --- |
| EC2 Compute | $41,000 | 49% | +18% |
| S3 Storage | $18,000 | 21% | +4% |
| Data Transfer | $14,000 | 17% | +9% |

> [!INFO]
> Increasing Reserved Instance coverage from 61% to 75% would save approximately **$9,000/month** based on current compute patterns.`,
    jsonEquivalent: JSON.stringify({
      kpis: [{ label: 'Total Spend', value: '$84,200', change: '+12%' }, { label: 'Reserved Coverage', value: '61%' }],
      chart: { type: 'pie', labels: ['Compute', 'Storage', 'Network', 'Other'], datasets: [{ data: [41000, 18000, 14000, 11000] }] },
      table: { head: ['Service', 'Cost', '% Total', 'Change'], rows: [['EC2', '$41k', '49%', '+18%'], ['S3', '$18k', '21%', '+4%'], ['Network', '$14k', '17%', '+9%']] },
      callout: { variant: 'info', message: 'Increasing reserved coverage to 75% saves ~$9k/month.' },
    }),
  },

  // ── 13. User Feedback Summary ───────────────────────────────────────
  {
    id: 'user-feedback',
    name: 'User Feedback Summary',
    userPrompt:
      'Summarize user feedback from the last sprint. NPS: 42 (+7). ' +
      'Top positive themes: faster load times (mentioned 84x), cleaner UI (61x). ' +
      'Top negative themes: missing dark mode (47x), mobile layout broken (39x). ' +
      'Show KPIs for NPS and key theme counts. Table of top 4 themes with sentiment. ' +
      'Danger callout: Mobile layout issues are blocking 12% of mobile users.',
    topics: ['kpi', 'tables', 'callouts'],
    expectedComponents: ['kpi', 'table', 'callout'],
    goldenExample: `## Sprint Feedback Summary

@kpi["NPS Score", "42", change: "+7", period: "vs last sprint"]
@kpi["Positive Themes", "2 major", change: "145 mentions", period: "this sprint"]
@kpi["Negative Themes", "2 critical", change: "86 mentions", period: "this sprint"]

| Theme | Sentiment | Mentions | Priority |
| --- | --- | --- | --- |
| Faster load times | Positive | 84 | — |
| Cleaner UI | Positive | 61 | — |
| Missing dark mode | Negative | 47 | Medium |
| Mobile layout broken | Negative | 39 | High |

> [!DANGER]
> Mobile layout issues are blocking **12% of mobile users** from core workflows. Escalate to the next sprint.`,
    jsonEquivalent: JSON.stringify({
      kpis: [{ label: 'NPS', value: '42', change: '+7' }, { label: 'Positive', value: '145 mentions' }, { label: 'Negative', value: '86 mentions' }],
      table: { head: ['Theme', 'Sentiment', 'Mentions', 'Priority'], rows: [['Load times', 'Positive', '84', '—'], ['Cleaner UI', 'Positive', '61', '—'], ['Dark mode', 'Negative', '47', 'Medium'], ['Mobile layout', 'Negative', '39', 'High']] },
      callout: { variant: 'danger', message: 'Mobile layout blocking 12% of mobile users.' },
    }),
  },

  // ── 14. API Migration Guide ─────────────────────────────────────────
  {
    id: 'api-migration',
    name: 'API Migration Guide',
    userPrompt:
      'Write a migration guide from API v1 to v2. ' +
      'Steps: audit current v1 usage (planned), update authentication headers (planned), ' +
      'replace deprecated endpoints (planned), test in staging (planned), deploy to production (planned). ' +
      'Two-column layout: left side breaking changes (3 items), right side new features (3 items). ' +
      'Warning callout: v1 is deprecated and will be removed on 2026-01-01.',
    topics: ['steps', 'layout', 'callouts'],
    expectedComponents: ['steps', 'layout', 'callout'],
    goldenExample: `## API v1 → v2 Migration Guide

> [!WARNING]
> **API v1 is deprecated** and will be removed on **2026-01-01**. Complete migration before then.

\`\`\`steps
- [planned] Audit current v1 endpoint usage in your codebase
- [planned] Update authentication headers to use Bearer tokens
- [planned] Replace deprecated endpoints with v2 equivalents
- [planned] Test all flows in the staging environment
- [planned] Deploy to production
\`\`\`

\`\`\`layout columns=2
### Breaking Changes
- Auth header format changed from \`X-Api-Key\` to \`Authorization: Bearer\`
- \`/v1/render\` renamed to \`/v2/content/render\`
- Response envelope changed: \`data\` key is now \`result\`

---

### New Features
- Streaming responses via SSE
- Batch processing up to 50 items
- Webhook callbacks for async jobs
\`\`\``,
    jsonEquivalent: JSON.stringify({
      callout: { variant: 'warning', message: 'v1 deprecated, removed 2026-01-01.' },
      steps: [{ status: 'planned', title: 'Audit v1 usage' }, { status: 'planned', title: 'Update auth headers' }, { status: 'planned', title: 'Replace deprecated endpoints' }, { status: 'planned', title: 'Test in staging' }, { status: 'planned', title: 'Deploy to production' }],
      layout: { columns: 2, sections: [{ title: 'Breaking Changes', items: ['Auth header changed', 'Endpoint renamed', 'Response envelope changed'] }, { title: 'New Features', items: ['SSE streaming', 'Batch processing', 'Webhook callbacks'] }] },
    }),
  },

  // ── 15. Sales Pipeline ──────────────────────────────────────────────
  {
    id: 'sales-pipeline',
    name: 'Sales Pipeline',
    userPrompt:
      'Q3 sales pipeline summary. KPIs: Total pipeline $4.2M, Weighted $1.8M, Deals at risk $620k. ' +
      'Bar chart of pipeline by stage: Prospect $1.4M, Qualified $980k, Proposal $820k, Negotiation $620k, Closing $380k. ' +
      'Table of top 5 deals: Company, Value, Stage, Close date, Owner. ' +
      'Warning callout: 3 deals totaling $620k are stalled over 30 days.',
    topics: ['kpi', 'charts', 'tables', 'callouts'],
    expectedComponents: ['kpi', 'chart', 'table', 'callout'],
    goldenExample: `## Q3 Sales Pipeline

@kpi["Total Pipeline", "$4.2M", change: "+$400k", period: "vs Q2"]
@kpi["Weighted Pipeline", "$1.8M", change: "+12%", period: "vs Q2"]
@kpi["Deals at Risk", "$620k", change: "3 stalled", period: ">30 days"]

\`\`\`chart
{
  "type": "bar",
  "labels": ["Prospect", "Qualified", "Proposal", "Negotiation", "Closing"],
  "datasets": [{ "label": "Pipeline ($k)", "data": [1400, 980, 820, 620, 380] }]
}
\`\`\`

| Company | Value | Stage | Close Date | Owner |
| --- | --- | --- | --- | --- |
| Acme Corp | $280k | Negotiation | Jul 31 | Sarah |
| GlobalTech | $210k | Proposal | Aug 15 | James |
| NovaSys | $180k | Closing | Jul 20 | Maria |
| BluePeak | $160k | Qualified | Sep 1 | James |
| CoreData | $140k | Negotiation | Aug 30 | Sarah |

> [!WARNING]
> 3 deals totaling **$620k** have been stalled for over 30 days. Schedule follow-ups this week.`,
    jsonEquivalent: JSON.stringify({
      kpis: [{ label: 'Total Pipeline', value: '$4.2M', change: '+$400k' }, { label: 'Weighted', value: '$1.8M', change: '+12%' }, { label: 'At Risk', value: '$620k', change: '3 stalled' }],
      chart: { type: 'bar', labels: ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closing'], datasets: [{ label: 'Pipeline ($k)', data: [1400, 980, 820, 620, 380] }] },
      table: { head: ['Company', 'Value', 'Stage', 'Close Date', 'Owner'], rows: [['Acme Corp', '$280k', 'Negotiation', 'Jul 31', 'Sarah'], ['GlobalTech', '$210k', 'Proposal', 'Aug 15', 'James'], ['NovaSys', '$180k', 'Closing', 'Jul 20', 'Maria'], ['BluePeak', '$160k', 'Qualified', 'Sep 1', 'James'], ['CoreData', '$140k', 'Negotiation', 'Aug 30', 'Sarah']] },
      callout: { variant: 'warning', message: '$620k stalled over 30 days.' },
    }),
  },
];
