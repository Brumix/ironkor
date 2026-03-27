## Exercise Catalog Seeding Archive

This folder preserves the exact process used to seed `auxExercises` into Convex.

Use this archive when you need to re-run the same import in the future without keeping
seed-specific backend code active in the normal codebase.

### Archive Contents

- `convex/seedFunctions.ts.template`: Convex mutation template used for idempotent exercise ingestion.
- `../seedExercises.mjs`: Source seed script with the `auxExercises` dataset and mutation calls.

### How to run the same process again

1. Restore the archived Convex mutation:
   - Copy `apps/mobile/seed/exercise-catalog-seeding-archive/convex/seedFunctions.ts.template`
   - Into `convex/seedFunctions.ts`
2. Regenerate Convex API/codegen:
   - `bun run convex:dev:once`
3. Run the seed script from repo root:
   - `bun --env-file=.env.local run apps/mobile/seed/seedExercises.mjs`
4. Verify the log summary:
   - `Inserted: X, Skipped: Y, Failed: Z`
5. Re-run once to confirm idempotency:
   - Expected `Inserted: 0`.
6. Clean up after seeding:
   - Remove `convex/seedFunctions.ts` again.

### Notes

- The archived mutation normalizes raw seed values server-side and dedupes by `nameText`.
- The seed script also dedupes repeated names inside the input file before calling Convex.
