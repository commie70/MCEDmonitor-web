# MCED Intel (Cancer Early-Screening Watch)

> Continuous monitoring of cancer early-detection products worldwide: **performance, technology route, cancer coverage, and regulatory progress**. Built for medical affairs, R&D, strategy, and pharma-partnership teams, with Geneseeq CanScan as the reference anchor.

**[中文](README.md)** · Live: <https://gs-mced.geneseeq.com>

---

## Site

| Section | Route | Content |
| --- | --- | --- |
| Featured | `/` | L1 / L2 event timeline with hot, regulatory, and anchor rails |
| All events | `/all` | Every event; filters for kind, company, region, origin, and keyword live in the URL |
| Hot | `/hot` | Ranked by level and importance over 31 / 90 / 365 days |
| Daily monitor | `/daily` | The latest monitor run: collection metrics, this issue's events, model digest, health |
| Topics | `/topics` | Entry points by company, technology route, cancer, regulatory status, study design, and event kind |
| Product board | `/leaderboard` | Performance cards for 19 companies: headline numbers come from one asymptomatic-screening study, named on the card, plus route, regulatory status and cancers |
| Performance | `/performance` | Two full-width charts — sensitivity × specificity scatter and the case-control → prospective sensitivity gap — above the study comparison table |
| Regulatory | `/regulatory` | Companies and milestones across NMPA / FDA / CE / LDT stages |
| Coverage | `/coverage` | Company × cancer matrix |
| MRD matrix | `/mrd` | Performance cards for 25 MRD products worldwide: assay design, limit of detection, clinical performance, regulatory and reimbursement status, public prices; `/mrd/{id}` lists every figure with its source |
| Sources | `/sources` | 198 public references; every number traces back to its original |
| Detail pages | `/companies/{id}` `/studies/{id}` `/items/{id}` `/sources/{id}` | Company profile, study evidence, event, source |
| More | `/agent` `/changelog` `/feedback` `/about` `/starred` | Agent access, changelog, feedback, about, stars (local browser only) |

Legacy URLs `/leaderboard/evidence/{company}/{index}` permanently redirect to `/studies/{id}`; legacy stars, theme preference, and REST v1 fields stay compatible.

## Data

**Evidence base** (`src/data/*.json`, hand-maintained): `companies` (19) · `studies` (50) · `sources` (198) · `milestones` · `pathfinder` · `mrd` (25) · `mrd-price-ranges`. Pages, REST, MCP, and RSS all read through `src/data/index.ts`.

- Studies are tiered by design: `RCT` → prospective interventional → prospective registry → prospective cohort → case-control. Case-control results do not generalise to real-world screening and are never plotted against prospective data.
- Every study and regulatory milestone points to a public link in `sources.json` (journal DOI / PubMed, conference abstract, trial registry, regulatory document, company announcement).
- **No local file paths, ever.** Material with no public original is rebuilt as an in-site page (`document` field → `/sources/{id}`).
- When a figure differs from the public original, the discrepancy is written to the study's `note` and shown on pages and in the API.
- **MRD matrix** (`mrd.json`) is sourced cell by cell. Assay design is recorded as tumor-informed / tumor-naive with the tissue assay (WES / WGS / panel). Limits of detection are kept as published, with their basis (LoD95, detection threshold, vendor claim) and scale (VAF, tumor fraction, clonal fraction) and are **never converted between scales**. Evidence has two tiers: peer-reviewed or regulator-reviewed (solid mark) versus vendor material or second-hand reports (outlined mark). Prices state what they are, what they cover, and when; currencies are not converted. A cell with no public source stays empty. China has no product-level public list prices, so only media-reported industry ranges are kept (`mrd-price-ranges.json`).
- `npm test` checks unique IDs, resolvable references, and the absence of local-path leaks.

**Events** are one view over two kinds of data (`src/lib/events.ts`): events released by the monitoring pipeline, plus study publications, regulatory milestones, and curated milestones from the evidence base.

## Monitoring pipeline (`npm run monitor`)

```
Authoritative / trusted sources (PubMed, openFDA, company sites, WeChat) + AnySearch discovery
  → canonical URL, body SHA-256, editorial owner, date
  → deterministic recall by company + product + event type + date → same-event / material-update decision
  → event ledger scripts/monitor-ledger.json (sole source of truth)
  → evidence gate: authoritative primary evidence, or two independent trusted owners
  → Qwen extraction and scoring; independent GLM review for high-risk cases; Kimi arbitration on conflict
  → importance = relevance 0/10/20/30 + impact 0/15/30/40/50 + actionability 0/10/20 → L1 / L2 / L3
  → release → public/monitor/daily-report.json (a rebuildable projection of the ledger)
```

### Publishing policy: fully automatic

No per-event human approval and no soak period.

- **Event level**: evidence confidence above Low and a level of L1–L3. High-risk events (L1, regulatory conclusions, clinical performance numbers) must pass independent model review — concurrence with the primary model, or a resolved arbitration — and are then released automatically (the ledger records `reviewed_by: model:<provider>/<model>`). Events without concurrence stay `pending`.
- **Run level**: publishing is open whenever the fixed acceptance suite passes. `npm run monitor:acceptance` runs 120 frozen cases plus live contract checks against all four providers, requiring semantic-match precision ≥ 98% and recall ≥ 95%. Each scheduled run first executes it with `-- --if-needed`: it re-runs when the last result failed, is older than 30 days, or the fixture, the model configuration, or the model-chain code (`scripts/lib-monitor-llm.mjs`) changed; otherwise the result is reused. Editing a prompt or review rule invalidates the previous result.
- **When acceptance fails**, collection and ledger updates continue, new events are held in the ledger and released automatically once acceptance passes again; events already released are never withdrawn.
- **Visibility**: the sidebar status, daily page, and changelog surface "collection outage" and "publishing paused".
- **Run budget**: once a run exceeds `MCED_RUN_BUDGET_MINUTES` (default 35; the scheduled job sets 150), remaining candidates are stored as replayable `pending` records and processed by the next run. A candidate the models keep disagreeing on is replayed at most 5 times.

`npm run monitor:review` is optional: it resolves `pending` events or withdraws a published one.

Model calls carry an output cap, back off and retry on rate limits (429), and retry once when the output is malformed or truncated. A source or model failure leaves only that candidate `pending` and never silently substitutes another model; ledger read, schema validation, or transactional-write failures abort the run while preserving the last valid ledger and report.

### Provider configuration

Keys are read only from environment variables or GitHub Actions Secrets. All four providers use an OpenAI-compatible `chat/completions` endpoint:

| Role | Base URL | API key | Model override |
| --- | --- | --- | --- |
| Qwen default analysis | `DASHSCOPE_BASE_URL` | `DASHSCOPE_API_KEY` | `QWEN_MONITOR_MODEL` |
| DeepSeek vision | `DEEPSEEK_BASE_URL` | `DEEPSEEK_API_KEY` | `DEEPSEEK_VISION_MODEL` |
| Independent GLM review | `GLM_BASE_URL` | `GLM_API_KEY` | `GLM_REVIEW_MODEL` |
| Kimi arbitration / digest | `KIMI_BASE_URL` | `MOONSHOT_API_KEY` | `KIMI_SYNTHESIS_MODEL` |

The deep thinking these models enable by default is switched off or set to its lowest effort, following each provider's documentation (Qwen `enable_thinking=false`; GLM / Kimi `reasoning_effort=low`): schema-constrained extraction and scoring do not need it, and it turns a call of a few seconds into one or two minutes. If a replacement model rejects these parameters, set `QWEN_ENABLE_THINKING` / `GLM_REASONING_EFFORT` / `KIMI_REASONING_EFFORT` to `default` to omit the field.

Base URLs have code defaults. Discovery defaults to `https://api.anysearch.com/mcp` (`ANYSEARCH_API_KEY` optional); `FIRECRAWL_API_KEY` is used only to fetch content from known evidence URLs. WeChat accounts are monitored through WeixinZS (`WEIXINZS_API_KEY`); posts only create candidates and cannot substantiate regulatory, clinical-performance, or study claims on their own.

Changing a model or endpoint after deployment needs no code change: edit Variables / Secrets under `Settings → Secrets and variables → Actions`, then dispatch a run —

```bash
gh api --method POST repos/commie70/MCEDmonitor-web/dispatches -f event_type=daily-monitor
# force a fresh model acceptance run
gh api --method POST repos/commie70/MCEDmonitor-web/dispatches -f event_type=daily-monitor-acceptance
```

GitHub Actions runs every 3 days (`.github/workflows/daily-monitor.yml`) and pushes the ledger, public report, run history, and changelog back to `master`; EdgeOne Pages redeploys automatically.

## Open interfaces (anonymous, read-only)

- `GET /api/v1/events` — unified event timeline; `?kind= ?company= ?level= ?since= ?q= ?origin=`
- `GET /api/v1/companies[/{id}]` · `GET /api/v1/studies[/{id}]` · `GET /api/v1/prospective` · `GET /api/v1/mrd` · `GET /api/v1/sources`
- `GET /api/v1/stories` · `GET /api/v1/items` · `GET /api/v1/daily` — pipeline events, evidence items, and the daily digest
- `POST /api/mcp` — MCP (Streamable HTTP, JSON-RPC 2.0, body ≤ 16KB):
  `get_top_stories` `get_events` `get_companies` `get_company` `get_prospective` `get_study` `get_mrd_products` `search_items`
- `GET /feed.xml` — RSS 2.0, latest 30 L1 / L2 events
- `/mced-skill/SKILL.md` — Agent Skill (install command on `/agent`; SHA-256 verified before writing)

```bash
codex mcp add mced-intel --url 'https://gs-mced.geneseeq.com/api/mcp'
claude mcp add --transport http mced-intel 'https://gs-mced.geneseeq.com/api/mcp'
```

## Commands

```bash
npm run dev                 # dev server
npm run check               # lint + typecheck + test + build
npm test                    # node:test: pipeline, security regressions, evidence-base integrity
npm run monitor             # monitor run (release decided automatically)
npm run monitor -- --dry-run --limit 10   # end-to-end trial, writes nothing
npm run monitor:acceptance  # model acceptance (live calls to all four providers)
npm run monitor:project     # rebuild the public report from the ledger
npm run monitor:review -- --list          # list pending events
npm run changelog           # build public/changelog.json from run history
npm run skill:hash          # recompute SHA-256 after editing public/mced-skill/SKILL.md
```

## Project structure

```
src/
  app/(site)/        # pages (shared shell, rendered per request)
  app/api/           # REST v1 and MCP
  app/feed.xml/      # RSS
  components/        # shell / feed / home / board / charts / sources / agent / feedback
  data/              # evidence-base JSON + types + read entry
  lib/               # event model, monitor-report reader, API mapping, date and URL helpers
  hooks/             # URL query state, local storage, stars, theme
scripts/
  mced-daily-monitor.mjs        # monitor orchestration entry
  lib-monitor-ledger.mjs        # event identity, evidence gate, release, transactional writes
  lib-monitor-llm.mjs           # fixed model roles, strict schemas, selective review and arbitration
  lib-release-gate.mjs          # release gate shared by every report writer
  evaluate-monitor-acceptance.mjs
  project-public-report.mjs · review-monitor-event.mjs · build-changelog.mjs
  monitor-ledger.json · monitor-sources.json · monitor-acceptance.json · monitor-history.jsonl
tests/               # node:test + 120 frozen acceptance cases
public/monitor/      # public report
```

Stack: Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · lucide-react. Deployed on Tencent Cloud EdgeOne; also runs on Vercel or Docker standalone.

Design and vocabulary: [`ADR.md`](ADR.md) (pipeline decisions and amendments) · [`CONTEXT.md`](CONTEXT.md) (ubiquitous language).

## Credits

- Inspiration: [AIHOT](https://aihot.virxact.com/) · WeChat blog "数字生命卡兹克"
- Scaffold: [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) (MIT)
- License: MIT
