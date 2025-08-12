Schemas for `public/data/**` to standardize city guides for rankings and RAG.

Files:
- `city_overview.schema.json`
- `visit_calendar.schema.json`
- `poi.schema.json`
- `neighborhood.schema.json`
- `seasonal_activities.schema.json`
- `connections.schema.json`
- `monthly_features.schema.json`
- `itinerary_module.schema.json`
- `event.schema.json`

Notes:
- Keep IDs stable (e.g., `poi:paris:louvre`).
- Prefer lowercase slugs and kebab-case filenames.
- Include `meta.lastUpdated` and `meta.dataVersion` when possible.


