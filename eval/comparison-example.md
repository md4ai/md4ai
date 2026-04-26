# Token Comparison Example: Revenue Dashboard

This document illustrates exactly how we compare `md4ai` tokens against a JSON baseline for a single evaluation test case.

## 1. The Scenario
**Task**: Summarize Q2 revenue performance with KPIs, a bar chart, and a warning callout.
**Required Features**: `kpi`, `charts`, `callouts`.

---

## 2. The md4ai System Prompt
This is what we send to the model to enable `md4ai`. It includes instructions for only the relevant "bridges".

```markdown
Write standard markdown by default. When richer presentation clearly improves the answer, 
you may use md4ai markdown extensions instead of JSON or JSX.

Use @kpi["label", "value", change: "...", period: "..."] for headline metrics.
Example: @kpi["Revenue", "$167k", change: "+18%", period: "QoQ"]

Use ```chart fenced blocks with JSON config for bar, line, pie charts.
Example: 
```chart
{ "type": "bar", "labels": ["Q1", "Q2"], "datasets": [{ "data": [10, 20] }] }
```

Use GitHub-style callouts for emphasis: > [!WARNING], > [!DANGER].
Example: > [!WARNING]\n> South region risk.
```
**Token Count (Input)**: ~140 tokens

---

## 3. The JSON System Prompt (Baseline)
This is the "tailored schema" we use as the baseline comparison.

```markdown
You are a helpful assistant. Return your response in JSON format according to this schema:
{
  "title": "string",
  "metrics": [
    { "label": "string", "value": "string", "change": "string" }
  ],
  "chart": {
    "type": "string",
    "labels": ["string"],
    "datasets": [{ "data": ["number"] }]
  },
  "callout": { "variant": "string", "message": "string" }
}
Do not include any prose or explanations. Only valid minified JSON.
```
**Token Count (Input)**: ~110 tokens

---

## 4. The Outputs (Comparison)

### md4ai Output (High Fidelity)
```markdown
# Q2 Revenue
@kpi["Total", "$2.4M", change: "+14%"]
```chart
{ "type": "bar", "labels": ["E", "W"], "datasets": [{ "data": [680, 590] }] }
```

> [!WARNING]
> South risk.
**Token Count (Output)**: ~65 tokens

### JSON Output (Minified Baseline)
```json
{"title":"Q2 Revenue","metrics":[{"label":"Total","value":"$2.4M","change":"+14%"}],"chart":{"type":"bar","labels":["E","W"],"datasets":[{"data":[680,590]}]},"callout":{"variant":"warning","message":"South risk."}}
```
**Token Count (Output)**: ~78 tokens

---

## 5. Pure Syntax Comparison (Bridges vs JSON Objects)

If we ignore the "Template" overhead (Titles, Prose, structural keys) and just look at the individual components:

| Component | md4ai Syntax | JSON Object (Minified) | Saving |
| --- | --- | --- | --- |
| **KPI** | `@kpi["Total", "$2.4M", change: "+14%"]` (39 chars) | `{"label":"Total","value":"$2.4M","change":"+14%"}` (51 chars) | **23%** |
| **Callout** | `> [!WARNING]\n> South risk.` (26 chars) | `{"variant":"warning","message":"South risk."}` (45 chars) | **42%** |
| **Chart (JSON)** | ` ```chart\n{...}\n``` ` (JSON + 12 chars) | `{"chart":{...}}` (JSON + 11 chars) | **-1%** |

**Note**: For KPI and Callout directives, md4ai is significantly denser because it uses positional arguments and markdown-native markers instead of repetitive JSON keys (`"label"`, `"value"`, etc.). For complex JSON-fenced blocks (like Charts), the density is nearly identical to raw JSON.

---

## 6. Final Token Math

| Metric | md4ai | JSON (Baseline) | Saving (md4ai) |
| --- | --- | --- | --- |
| **Input (Prompt)** | 140 | 110 | -30 tokens |
| **Output (Payload)** | 65 | 78 | **+13 tokens (17%)** |
| **Total Call Cost** | 205 | 188 | -17 tokens |

**Note on Benchmarking**: In our live evaluation dashboard, we now focus exclusively on the **Output (Payload)** savings. This "Pure Syntax Comparison" highlights the density efficiency of the `md4ai` bridges vs minified JSON, ignoring the one-time system prompt overhead which can be cached or reused.
