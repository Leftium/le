# `pages` add-on

The `pages` add-on configures a compatible static project for deployment to GitHub Pages. The first implementation supports fully prerendered SvelteKit projects. Vite and other frameworks remain later integrations; they must not drive a generic migration framework in v0.

App configuration belongs to the selected package; the workflow belongs to the repository root. Workspace deployment must use the selected app directory and workspace install context. Require an explicit repository target when it cannot be detected; Git is not required for local file preparation. See [project detection](../30-cli.md#project-detection).

## First implementation boundary

Support fully prerendered SvelteKit output with no SPA fallback. Handle a recognized default adapter through an explicit replacement choice, preserve unrelated configuration, and reject unsupported custom adapter migrations. Keep project-site, root-site, and custom-domain base paths correct, while reporting remote settings and DNS as manual follow-up.

Separate three outcomes: local configuration applied, static build verified, and remote deployment verified. A skipped build or deployment check must remain visible. The reusable workflow's inputs, permissions, working directory, output paths, and immutable release reference must be specified and published before generating consumer callers. Validate one consumer before generalizing.

SPA fallbacks, arbitrary adapter migrations, non-Kit support, and automatic remote configuration are deferred. Workspace Pages support requires a verified app-directory/shared-install workflow contract; report unsupported combinations rather than guessing.

## Command

```sh
le add pages
```

The add-on owns project configuration and generated repository files. Enabling Pages, choosing a domain, changing DNS, and retiring an existing host remain explicit remote or manual operations unless a future authenticated integration is added.

## Preconditions

Confirm that production requests can be served from static output. Required request-time server execution, private environment variables, request-specific headers, or server-only cookies make the project incompatible. Server-side code that runs only during prerendering is not by itself a blocker. Inspection establishes likely compatibility; a successful static build and route checks establish the result. See the [SvelteKit static adapter documentation](https://svelte.dev/docs/kit/adapter-static).

A secret used only during CI build or deployment does not require a runtime server.

## Project changes

For a compatible project:

1. For SvelteKit, install and configure `@sveltejs/adapter-static`.
2. Configure prerendering, trailing-slash, and path behavior for static output without a fallback.
3. Derive the base path from the canonical site URL: `/repository` for a project site under that path, or empty for a custom domain or user/organization root site. Preserve the framework's corresponding development behavior.
4. Detect the published directory when possible: normally `build/` for SvelteKit. Ask or require an option when detection is ambiguous.
5. Create a thin consumer workflow that calls a versioned reusable workflow from the Leftium repository.
6. Keep branch triggers in the caller. Pass project-specific callable inputs such as app directory, build commands, package manager, and published directory.
7. Report custom-domain configuration in repository Pages settings as a remote follow-up. Custom Actions deployments ignore `CNAME` files; do not generate one for this workflow. Preserve an existing file unless its migration is explicitly selected. See [GitHub custom-domain configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
8. Report remote GitHub, DNS, URL-reference, and old-host cleanup as follow-up work.

The reusable workflow owns installation, checks, optional tests, building, artifact upload, and deployment. Keeping this logic centralized allows projects to update by changing a pinned workflow reference instead of copying new workflow bodies.

Generated wrappers should derive tool versions and commands from project metadata where practical. Do not copy fixed versions from the migration template when the project declares them.

## Existing configuration

Preserve unrelated Svelte and Vite configuration. Offer the recognized default-adapter replacement described above. For other adapter, base-path, workflow, or detected domain conflicts, stop and explain rather than silently replacing configuration.

A workflow caller contains supported user customization, so do not regenerate it wholesale merely because Leftium initially created it. Update known fields or perform a targeted caller migration; explain unsupported customization.

Custom-domain aliases require HTTP redirects; multiple DNS aliases must not be treated as multiple Pages custom domains.

## Adoption and maintenance documentation

Document the shared workflow for humans and coding agents: adoption and update steps, workflow anatomy, reasons for non-obvious settings, caller versus shared ownership, supported customization, version/change notes, migration instructions, and troubleshooting. Keep caller permissions and project-specific inputs locally inspectable. Generated wrappers should link the owning documentation and explain why they remain thin.

Future updates may migrate caller inputs or local configuration as well as change the workflow reference. Preserve supported branch, build, package-manager, and output choices. Cross-repository version auditing and caller migrations belong to the roadmap; they do not require a separate consumer-version database.

## Verification

Tests must cover supported SvelteKit projects, new and existing configuration, incompatible server behavior, unknown output directories, project-site, user/organization-site, and custom-domain paths, routes and assets, workflow-version changes, conflicts, valid deterministic workflow YAML, and an idempotent second run.

The earlier [migration plan](../../20-github-pages-migration/10-plan.md) contains the project inventory and rollout. Its [workflow template](../../20-github-pages-migration/20-workflow-template.yml) is reference material, not a second source of product requirements.
