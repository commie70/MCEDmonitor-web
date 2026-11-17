# sol6.1 functional port

Base: `dc9d36e05657bc2bf28167d9dfce7b543caf403f` (master = origin/master at fetch).
Source: `bc25d7f` (`rebuild/sol6.1`), with operational projection from `039a9b1`.

The original commits mix UI, evidence and pipeline changes, so none is applied wholesale. Functional changes are adapted on a temporary branch based on current master, then cherry-picked as a linear commit onto master. This is a selective port, not a merge of the old workspace implementation.

## Included

- MRD: 25 → 44 records. All existing master IDs retained; newer master-only products and stronger price/technical disclosures remain. New sources use `src/data/sources.json`; runtime reads only through `@/data`.
- `hybrid` and undisclosed strategy, IG/TCR tissue discovery and digital-PCR follow-up. Tissue and follow-up filters are independent. Product cards remain the default; technology, analytical, clinical and price views use master components/tokens.
- Analytical specificity and quantitative precision/LoQ with source conditions. PPV/NPV and clinical populations survive serialization.
- CDx separated from Signatera LDT; PROPHET/TRACER/AACR research configurations separated from current commercial products. Reinert day-30 and longitudinal populations corrected to their distinct analysis sets. The older Geneplus 1021 record remains distinct from the 5000+ product.
- Product JSON detail, collection/MCP tracking and keyword filters, institution prices, CSV exports for MRD, products, research, performance and regulatory records. MRD export uses the displayed filters and includes original conditions/source URLs. Other exports explicitly export the full corresponding catalog.
- Institutional CNY 1,680/case reference, Japan Reveal self-pay, clonoSEQ payer reimbursement and BGI delisted historical range retained with currency/type/date/coverage. Missing prices stay missing. New numeric LoDs are not converted across units.
- Build-time operational projection exposes source check/success times, consecutive failures, coverage gaps and aggregate pending counts. Current release gate supplies publication status. No evidence text, raw errors, credentials or private URLs are exposed. `prebuild` regenerates the snapshot for deployments; the existing collector/report writer is unchanged.
- Agent/API documentation and Skill checksum updated.

## Excluded / already on master

The old shell, CSS, green workspace layout, duplicate products/compare/evidence pages, manual review workflow, legacy report writer, old daily report and branch-specific browser screenshots were excluded. Country fields, basic MRD, existing source reconstruction and 50 early-screening study records already have master implementations. This port does not replace those with a parallel data layer. `error.tsx`/`loading.tsx` from the old shell are UI changes and were not ported.

Evidence dates remain the source snapshot dates (November 12 or master's November 13). This migration does not claim a new November 17 medical/price audit. The original independent review is retained in `sol61-mrd-source-review.json`; its limitations and rejected fields informed the port. New schema defaults do not promote unverified candidates into approved or currently orderable tests.

## Verification

`npm run check`: 92 tests, lint, TypeScript and production build. Docker builds using the frozen lockfile. Real-browser acceptance checks all 44 MRD details and JSON records, independent filters with reload, five views, CSV downloads, MCP parity, operation-status privacy, existing routes, and 390px light/dark layouts. Results are in `sol61-integration/acceptance.json`. No production deployment is implied.

## Preserved files (SHA-256)

- `src/app/globals.css`: `e06ad682809f3fda829ebad3a4995e28d77dd65267084f283c8b832bda353d4f`
- `src/app/layout.tsx`: `73ef4aa716219b83121223cdd548f63d7ae1ccc034bb351566c2b55076d41c3a`
- `scripts/mced-daily-monitor.mjs`: `671d9798d673f4f5cf9b670095161821678aa42b915600d9532e82eb30eda20b`
- `scripts/project-public-report.mjs`: `d59b22ab31e38ecf9c9c767c29a0bdcfdcb8e0e1d00f7e3e0c5c722614ea15e0`
- `scripts/lib-release-gate.mjs`: `db8b3eb81b6af3dd30f15b6df9c06aede6a4acf9745ba1f4f872b9a0ff2a4769`
- `.github/workflows/daily-monitor.yml`: `bb6491a25902b69ca90b466059b033381c30a5b9c89d8be240d05b972c112af5`
- `public/monitor/daily-report.json`: `94e46c4f404821962bec738618add5d105f323ca09fbecb00d801d5971ffb81f`
- `scripts/monitor-ledger.json`: `3d098533685a47ab2d94b3cdcad99551a12398a999aeaec2ade4bddfb5119690`
- `scripts/monitor-acceptance.json`: `92a9a6952e3dbee68e20b2ab61e8d4aee2d48a28093f8a3e606655682e606c82`

## Product ID mapping

| sol6.1 | master |
| --- | --- |
| geneseeq-shuning-ultra | geneseeq-shielding-ultra |
| burningrock-langwei | burningrock-langwei |
| burningrock-pharos | burningrock-pharos |
| geneplus-jichangan | geneplus-jichangan-5000 |
| genecast-langweibo | genecast-langweibo |
| genecast-changweibo | genecast-changweibo |
| genecast-weishibo | genecast-weishibo |
| genecast-zhenbeian | genecast-zhenbeian |
| bgi-huajianwei | bgi-huajianwei |
| tongshu-zhenxinan | tongshu-zhenxinan |
| origimed-orimiracle-s | origimed-orimiracles |
| origimed-orimiracle-l | origimed-orimiracle-l |
| haplox-haiweiqing | haplox-haiweiqing |
| haplox-haiweijing | haplox-haiweijing |
| 3dmed-feichangankang | 3dmed-feichangankang |
| genetron-seq-mrd | genetron-seq-mrd |
| genetron-dongwei | genetron-dongwei |
| predicine-beacon-china | predicine-beacon-china |
| signatera-ldt | natera-signatera |
| signatera-cdx | signatera-cdx |
| guardant-reveal-epigenomic | guardant-reveal |
| oncodetect-v1 | exact-oncodetect |
| oncodetect-v2 | exact-oncodetect-wgs |
| next-personal | personalis-next-personal |
| myriad-precise-mrd | myriad-precise-mrd |
| tempus-xm-naive | tempus-xm |
| haystack-mrd | haystack-mrd |
| plasma-detect-genome | labcorp-plasma-detect-genome |
| radar-st | neogenomics-radar-st |
| foresight-clarity | foresight-clarity |
| saga-pathlight | foundationone-mrd |
| veracyte-truemrd | veracyte-truemrd |
| adaptive-clonoseq | adaptive-clonoseq |
| geneseeq-shuning-aacr2026 | geneseeq-shuning-aacr2026 |
| saga-tracer2025 | saga-tracer2025 |
| burningrock-prophet2023 | burningrock-prophet2023 |
