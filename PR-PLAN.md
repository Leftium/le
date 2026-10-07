# PR Plan

## Goal

Implement issue #14 by replacing the hard-coded default reusable Pages workflow SHA with release-time SHA stamping so the published `leftium` package defaults to the exact commit that produced the release.

## Scope

- Introduce a deterministic build/release mechanism that stamps the final release commit SHA into the published package's default `pagesWorkflowRef`.
- Preserve `--workflow-ref` as an explicit override.
- Extend release validation so `.github/workflows/pages.yml` changes require a package-version bump.
- Verify the packed/release artifact generates callers pinned to the release SHA.
- Preserve the existing npm trusted-publishing and GitHub release flow.
- Update `docs/pages.md` for the new release model and historical v1 context.

## Constraints

- Normal squash merges must remain supported; no special merge mode may be required.
- Release mode must fail closed on missing, malformed, or mismatched SHA input.
- Local development/tests must remain deterministic without requiring a future release SHA.
- Existing consumers pinned to historical SHA `0637ad053ad33f8d997a20394dd1dc1afc33c985` need no migration.
- Do not perform an actual external release during implementation; final merge/release remains with the user.

## Likely implementation areas

- `src/addons/pages/index.ts`
- build/package scripts in `package.json` and/or a small release/build helper
- `.github/workflows/publish.yml`
- CI/release validation
- Pages tests, especially `tests/pages.test.ts`
- `docs/pages.md`

## Checkpoints

1. Define and test the build-time stamping boundary independently of publishing.
2. Wire release CI to stamp/validate `GITHUB_SHA` and enforce the Pages-workflow/package-version invariant.
3. Add artifact-level verification and documentation.
4. Run the full repository verification required by policy and leave the PR Ready with no active lease.

## Verify

At minimum:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm format:check`
- focused tests proving generated callers contain the stamped release SHA
- focused failure tests for invalid/missing release SHA and Pages workflow changes without package version bumps
- inspection of the packed artifact or equivalent release-boundary output proving the literal 40-character SHA is present

Do not publish to npm or create a real GitHub release as part of implementation verification.
