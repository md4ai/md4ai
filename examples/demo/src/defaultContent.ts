export const DEFAULT_CONTENT = `# Q1 2025 Sales Analysis

Here's a breakdown of your Q1 performance across regions, with key insights and recommended next steps.

## Revenue by Region

\`\`\`chart
{
  "type": "bar",
  "labels": ["North", "South", "East", "West", "APAC"],
  "datasets": [
    {
      "label": "Q1 2025 Revenue ($k)",
      "data": [142, 98, 167, 121, 89],
      "backgroundColor": ["#4f46e5","#4f46e5","#4f46e5","#4f46e5","#4f46e5"]
    },
    {
      "label": "Q4 2024 Revenue ($k)",
      "data": [128, 105, 141, 110, 74]
    }
  ]
}
\`\`\`

## Key Insights

> [!NOTE]
> **East region** leads with **$167k**, up 18% quarter-over-quarter — driven largely by the enterprise deal with Meridian Corp that closed in late February.

> [!WARNING]
> **South region** is down 7% from Q4. Churn spiked in the SMB segment. Recommend a targeted retention campaign before end of Q2.

> [!TIP]
> **APAC** shows the strongest growth trajectory (+20% QoQ) from a smaller base. This is the right time to invest in that market before competitors establish dominance.

## Performance Summary

| Region | Q1 Revenue | QoQ Change | Top Driver |
|--------|-----------|------------|------------|
| East | $167k | +18% | Meridian Corp deal |
| North | $142k | +11% | SMB expansion |
| West | $121k | +10% | New AE onboarding |
| South | $98k | -7% | SMB churn |
| APAC | $89k | +20% | New partnerships |

## Monthly Trend

\`\`\`chart
{
  "type": "line",
  "labels": ["January", "February", "March"],
  "datasets": [
    { "label": "North", "data": [44, 47, 51] },
    { "label": "East", "data": [48, 61, 58] },
    { "label": "South", "data": [38, 30, 30] }
  ]
}
\`\`\`

## Recommended Actions

:::card{title="Immediate (this week)"}
Schedule a call with the South region AEs to understand the SMB churn drivers. Pull exit survey data from the last 30 churned accounts before the call.
:::

:::card{title="This Quarter"}
Allocate 2 additional AE headcount to APAC. East region momentum is self-sustaining — focus management attention on replicating that playbook in the West.
:::

---

\`\`\`layout columns=2
### What's Working
- Enterprise motion in East is repeatable
- North AE onboarding program producing results
- APAC partner channel gaining traction

---

### What Needs Attention
- South SMB retention — churn is accelerating
- West pipeline coverage is thin for Q2
- APAC needs dedicated support resources
\`\`\`

---

## APAC Market Overview

Watch the recorded pitch from our APAC partner summit to understand the opportunity.

\`\`\`video
https://www.youtube.com/embed/dQw4w9WgXcQ
\`\`\`

---

## Action Items

- [x] Pull Q1 revenue data from CRM
- [x] Identify top churned accounts in South
- [ ] Schedule South region review call
- [ ] Allocate 2 APAC AE headcount
- [ ] Draft Q2 forecast model

Here's a snapshot of where things stand:

@kpi[value: $167k, label: East Revenue, change: +18%, period: QoQ]
@kpi[value: $98k, label: South Revenue, change: -7%, period: QoQ]
@kpi[value: $89k, label: APAC Revenue, change: +20%, period: QoQ]

North monthly trend: @sparkline[44, 47, 51]
East monthly trend: @sparkline[48, 61, 58]
South monthly trend: @sparkline[38, 30, 30]

Project status: @timeline[Data Pull: done, Analysis: done, Review: active, Forecast: planned]

Want me to dig deeper into any region or build a Q2 forecast model?

::button[Export Report]{href="#" variant="primary"}
::button[Build Q2 Forecast]{href="#" variant="secondary"}

---

## Upgrade to unlock APAC forecasting

Advanced regional forecasting and AI-assisted deal scoring require a Pro plan.

@payment[amount: $49, plan: Pro Monthly, desc: Unlimited regional forecasts, AI deal scoring, and priority support for your entire team]

::input{type="text" placeholder="Ask a follow-up question..." label="Follow-up"}
`;
