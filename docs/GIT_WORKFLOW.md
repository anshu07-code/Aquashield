# GIT WORKFLOW (so four people never block each other)

1. `git checkout main && git pull` -> `git checkout -b p1/report-flow`
2. Commit small and often. Format: `feat(web): add report result card`.
3. Before pushing: `git pull --rebase origin main`, then `npm test`.
4. Open a PR into `main`. Another person glances at it (2 minutes). CI must be green. Merge. Delete the branch.
5. Merge at least 2-3 times a day. A branch older than half a day is a smell.
6. **Contract changes** (`packages/types`, `mocks`, `docs/CONTRACT.md`): announce in chat first, tiny PR, merge fast, everyone pulls.
7. Only edit your own folders (see ownership in AGENTS.md). Cross-folder help = ask or small PR.
8. Never commit: `.env*`, keys, `samconfig.toml`, large raw data. Use `.env.example`.
9. Use your own GitHub account; set `git config user.name` and `user.email` (linked to GitHub).
10. Merge conflict? The person who pulled second resolves it, and tests before pushing.

## If someone's output doesn't match someone else's input
The schema in `packages/types` decides who is right. If the schema is wrong: fix it by PR + announce. If code drifted from it: that side fixes its code. Nobody patches another person's code to make it work.

## Environments
One shared deployed dev stack owned by P2. Everyone uses its URL. P2 redeploys after merges to `main` and before each checkpoint. UI can run on mocks (`NEXT_PUBLIC_USE_MOCKS=true`) when the API is down.
