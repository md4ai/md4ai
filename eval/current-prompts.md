# Live Prompt Comparison: Revenue Dashboard

This document shows the exact strings being sent to the NVIDIA NIM models during the current evaluation.

## 1. User Prompt (The Request)
> "Summarize the Q2 revenue performance. We saw $2.4M total, which is 14% up from Q1. Show a breakdown of the regions: East ($680k), West ($590k), North ($610k), and South ($520k). The South region is a bit concerning as it missed the target by 5%."

---

## 2. md4ai System Prompt (Standard Mode)
This is what the model sees when `md4ai` is enabled. It only includes instructions for the components needed for this specific task.

```markdown
Write standard markdown by default. When richer presentation helps, you may use md4ai markdown extensions instead of JSON or JSX. If unsure about syntax, fall back to plain markdown rather than inventing unsupported directives or markers.

Use GitHub-style callouts for emphasis and recommendations: > [!NOTE], > [!TIP], > [!WARNING], > [!DANGER], or > [!INFO].

Use ```chart fenced blocks with JSON config for bar, line, pie, doughnut, or radar charts.

Use @kpi["label", "value", change: "...", period: "..."] for headline metrics and stat cards. Keep labels short.

Use standard markdown tables for comparisons, reports, and summaries; md4ai enhances their presentation automatically.
```

---

## 3. JSON System Prompt (Baseline)
This is the "Fair Estimate" JSON prompt. We provide a specific schema that matches the data types needed for the task.

```markdown
You are a helpful assistant. Return your response in JSON format according to this schema:
{
  "type": "string",
  "title": "string",
  "metrics": [
    {
      "label": "string",
      "value": "string",
      "change": "string",
      "period": "string"
    }
  ],
  "chart": {
    "type": "string",
    "labels": [ "string" ],
    "datasets": [
      {
        "label": "string",
        "data": [ "number" ]
      }
    ]
  },
  "table": {
    "head": [ "string" ],
    "rows": [ [ "string" ] ]
  },
  "callout": {
    "variant": "string",
    "message": "string"
  }
}
Do not include any prose, markdown, or explanations. Only valid minified JSON.
```

---

## Comparison Summary
| Metric | md4ai | JSON |
| --- | --- | --- |
| **System Instruction** | Natural language / Tool-like | Schema definition |
| **Constraint** | "Markdown by default" | "JSON only, no prose" |
| **Goal** | Interactive Presentation | Data Interchange |
