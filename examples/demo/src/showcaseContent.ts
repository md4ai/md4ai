export const SHOWCASE_CONTENT = `# Q1 2025 Business Review

Here's your complete Q1 performance summary across all regions, with strategic recommendations for Q2.

## Revenue Performance

\`\`\`chart
{
  "type": "bar",
  "labels": ["North", "South", "East", "West", "APAC"],
  "datasets": [
    {
      "label": "Q1 2025 ($k)",
      "data": [142, 98, 167, 121, 89],
      "backgroundColor": ["#6366f1","#6366f1","#6366f1","#6366f1","#6366f1"]
    },
    {
      "label": "Q4 2024 ($k)",
      "data": [128, 105, 141, 110, 74],
      "backgroundColor": ["#e4e4e7","#e4e4e7","#e4e4e7","#e4e4e7","#e4e4e7"]
    }
  ]
}
\`\`\`

## Key Metrics

@kpi[value: $617k, label: Total Revenue, change: +11%, period: QoQ]
@kpi[value: $167k, label: East Region, change: +18%, period: QoQ]
@kpi[value: $89k, label: APAC, change: +20%, period: QoQ]
@kpi[value: $98k, label: South Region, change: -7%, period: QoQ]

## Regional Trends

East: @sparkline[48, 52, 61, 58, 67, 71]
North: @sparkline[44, 47, 51, 49, 55, 58]
South: @sparkline[38, 35, 30, 28, 30, 27]
APAC: @sparkline[22, 26, 31, 35, 41, 47]

## Key Insights

> [!NOTE]
> **East region** leads all markets at **$167k** — the Meridian Corp enterprise deal closed in late February and immediately contributed $34k. This playbook is repeatable.

> [!TIP]
> **APAC** is your highest-growth market at +20% QoQ from a smaller base. Two additional AE headcount now compounds faster than anywhere else in the portfolio.

> [!WARNING]
> **South region** declined 7% — SMB churn is accelerating. Exit survey data shows pricing sensitivity as the primary driver, not product dissatisfaction.

## Performance Table

| Region | Q1 Revenue | QoQ | ARR Run Rate | Risk |
|--------|-----------|-----|-------------|------|
| East | $167k | +18% | $2.0M | Low |
| North | $142k | +11% | $1.7M | Low |
| West | $121k | +10% | $1.5M | Medium |
| South | $98k | -7% | $1.2M | High |
| APAC | $89k | +20% | $1.1M | Low |

## Monthly Trend

\`\`\`chart
{
  "type": "line",
  "labels": ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
  "datasets": [
    { "label": "East", "data": [48, 52, 61, 58, 67, 71], "borderColor": "#6366f1", "backgroundColor": "rgba(99,102,241,0.08)", "fill": true },
    { "label": "APAC", "data": [22, 26, 31, 35, 41, 47], "borderColor": "#16a34a", "backgroundColor": "rgba(22,163,74,0.06)", "fill": true },
    { "label": "South", "data": [38, 35, 30, 28, 30, 27], "borderColor": "#dc2626", "backgroundColor": "rgba(220,38,38,0.06)", "fill": true }
  ]
}
\`\`\`

## Recommended Actions

:::card{title="This Week"}
Run the South SMB exit survey analysis — 47 churned accounts in Q1, data is already in the CRM. Identify the top 3 objection patterns before the regional QBR on Thursday.
:::

:::card{title="This Month"}
Promote the East AE playbook company-wide. Schedule a 2-hour session where the East team walks through the Meridian deal cycle. Record it. Every AE should watch it before their next enterprise call.
:::

## Q2 Roadmap

@timeline[South Retention: active, East Playbook Rollout: active, APAC Hiring: planned, West Pipeline Build: planned, Q2 Forecast Lock: planned]

---

\`\`\`layout columns=2
### Strengths to Protect
- East enterprise motion — repeatable and documented
- APAC partner channel — gaining momentum
- North AE onboarding program — 3 new reps ramped

---

### Risks to Address
- South SMB churn accelerating — pricing perception
- West Q2 pipeline coverage at 1.4× — below 2× target
- APAC lacks dedicated support resources post-sale
\`\`\`

---

## Action Items

- [x] Pull Q1 revenue data from CRM
- [x] Identify top 47 churned accounts in South
- [x] East playbook documentation complete
- [ ] Schedule South region retention campaign
- [ ] Allocate 2 APAC AE headcount — req submitted
- [ ] Build Q2 forecast model with scenario analysis

---

## Unlock AI Deal Scoring

Predict which deals close before your AEs waste cycles on them. Our AI scoring model trained on 14,000 closed-won and closed-lost deals is available on Pro.

@payment[amount: $49, plan: Pro Monthly, desc: AI deal scoring, unlimited regional forecasts, and Slack digest for your entire team]
`;
