# `pages` add-on

The `pages` add-on configures a compatible static project for deployment to GitHub Pages. SvelteKit is the first required integration, but the design must also support non-Kit projects such as Vite applications.

## Command

```sh
le add pages
```

The add-on owns project configuration and generated repository files. Enabling Pages, choosing a domain, changing DNS, and retiring an existing host remain explicit remote or manual operations unless a future authenticated integration is added.

## Preconditions

Confirm that the project can be built statically. Required server routes, request-time private environment variables, request-specific headers, server-only cookies, or SSR-only behavior make it incompatible until those dependencies are removed.

A secret used only during CI build or deployment does not require a runtime server.

## Project changes

For a compatible project:

1. For SvelteKit, install and configure `@sveltejs/adapter-static`.
2. Configure any fallback, trailing-slash, and path behavior required by its framework and routes.
3. Set a repository base path, or no base path for a custom domain.
4. Detect the published directory when possible: normally `build/` for SvelteKit and `dist/` for Vite. Ask or require an option when detection is ambiguous.
5. Create a thin consumer workflow that calls a versioned reusable workflow from the Leftium repository.
6. Pass only project-specific inputs, such as trigger branch, build commands, package manager, and published directory.
7. Add `static/CNAME` or the framework-equivalent file only after selecting a canonical custom domain.
8. Report remote GitHub, DNS, URL-reference, and old-host cleanup as follow-up work.

The reusable workflow owns installation, checks, optional tests, building, artifact upload, and deployment. Keeping this logic centralized allows projects to update by changing a pinned workflow reference instead of copying new workflow bodies.

Generated wrappers should derive tool versions and commands from project metadata where practical. Do not copy fixed versions from the migration template when the project declares them.

## Existing configuration

Preserve unrelated Svelte and Vite configuration. If an adapter, base path, workflow, or `CNAME` conflicts, stop and explain rather than silently replacing it.

Custom-domain aliases require HTTP redirects; multiple DNS aliases must not be treated as multiple Pages custom domains.

## Verification

Tests must cover SvelteKit and Vite projects, new and existing configuration, incompatible server behavior, unknown output directories, repository and custom-domain paths, routes and assets, workflow-version changes, conflicts, valid deterministic workflow YAML, and an idempotent second run.

The earlier [migration plan](../../20-github-pages-migration/10-plan.md) contains the project inventory and rollout. Its [workflow template](../../20-github-pages-migration/20-workflow-template.yml) is reference material, not a second source of product requirements.
