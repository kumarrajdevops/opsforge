# TODO

## Rework the shared tools inventory

Source: `devops_devsecops_mlops_llmops_official_links_inventory.xlsx`, converted by `scripts/inventory-to-json.mjs` into `apps/web/src/features/technologies/inventory.json` and merged into the catalog by `technologies/inventory.ts`.

- [ ] Review the generated entries by hand: spellings, categories and the `SKIP` and `CASE_SENSITIVE` name lists in `inventory.ts`; check for tools that are missed or wrongly matched in real postings and resumes.
- [ ] Clean the workbook itself: 61 rows repeat a name across disciplines, and the cloud-vendor services (Amazon, Azure, Google) are listed as separate tools although the app folds them into AWS, Azure and GCP. Decide the canonical row for each and fix the source instead of working around it in code.
- [ ] Give generated entries real interview topics and `related` links. They currently inherit the topic of the first curated entry in their category, so scored evidence does not carry between related tools.
- [ ] Revisit the discipline-to-category mapping (for example "Azure DevOps" and "Azure Pipelines" currently fold into Azure, and Networking and Edge maps to one broad category).
- [ ] Show the official website and documentation links in the Tools tables.
- [ ] Decide whether the xlsx or only the generated JSON is the maintained source, and add a check that the JSON matches the workbook.
- [ ] Confirm the cost of compiling about 600 alias patterns at load, and lazy-build them if it shows up in startup time.
