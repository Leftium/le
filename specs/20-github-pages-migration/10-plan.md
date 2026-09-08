# GitHub Pages migration plan

**Date:** 2026-09-07
**Status:** Recorded as in progress on 2026-09-07; YouLoop completed at that checkpoint

This operational plan predates [Leftium](../10-leftium/00-spec.md). Continue using the checked-in workflow template for current migrations. Once `le add pages` is available, migrate these projects to the add-on and treat the [Pages add-on spec](../10-leftium/40-addons/30-pages.md) as the source of product requirements.

Deployment and inventory observations below are the recorded migration checkpoint, not a fresh fleet audit. Recheck the target repository and host before each rollout or retirement.

## Pilot status: fx

`https://fx.leftium.com/` is live from GitHub Pages: it resolves through `leftium.github.io`, returns `200`, and includes GitHub Pages response headers. The canonical direct deep links `/fire-palette` and `/fire-plasma` also return `200`; the generated navigation uses that no-trailing-slash form.

The current artifact emits route files such as `fire-palette.html`, which GitHub Pages serves for `/fire-palette`. The trailing-slash variant `/fire-palette/` returns `404`, so keep the generated no-trailing-slash URLs canonical unless the application is intentionally changed to emit `/route/index.html` instead. Verify the remaining routes, asset URLs, refreshes, and interactions before removing the Vercel deployment or moving the custom domain exclusively to Pages.

## Completed migration: youloop

YouLoop is live on GitHub Pages at its canonical URL, `https://youloop.leftium.com`. The SvelteKit application now builds as a static artifact, reads shared YouTube loop parameters in the browser, and deploys through the Pages workflow. The workflow follows the shared Pages template, including Node 24 and the current Pages actions.

The previous Vercel project's Git connection should be disconnected once no rollback window is needed. Do not treat a paused Vercel project as retired: it can still create blocked deployment records for new Git pushes.

## Goal

Move the Vercel projects that can run as static browser applications to GitHub Pages, reducing Vercel Fluid CPU usage without removing required server behavior.

The first migration batch should target `fx`, `youloop`, `leftium-logo`, `gg`, `doggo`, `rift-transcription`, and `p5-kit`. Together they account for about 25.0% of the CPU shown in the Vercel screenshot.

Each migrated project must choose one canonical production URL: either an existing `*.leftium.com` custom domain served at the domain root, or its repository-scoped `https://leftium.github.io/<repository>/` URL. The latter remains a valid production choice, as demonstrated by `https://leftium.github.io/nimble.css`.

Before migrating `fx`, rename its `Leftium/static` local directory and GitHub repository to `fx`. This aligns the repository, project, and existing `fx.leftium.com` domain before Pages is enabled. Complete the rename before adding a Pages base-path configuration or deploying, so the repository-scoped preview URL and any temporary `base` value do not become a long-lived compatibility constraint.

## Current classification

| Project | CPU | Recommendation | Reason |
| --- | ---: | --- | --- |
| veneer | 38.1% | Keep on Vercel | Fetches Google Forms/Sheets dynamically, generates request-specific metadata, uses cookies, and proxies form submissions. |
| hn | 21.0% | Keep on Vercel | Fetches HN/Hckrnews data server-side, manages session/configuration cookies, routes by host, and proxies comment classification. |
| weather-sense | 11.9% | Keep on Vercel | Uses private environment variables, server proxy endpoints, Vercel IP location headers, and live weather data. |
| fx | 9.7% | Move | Fully client/static. |
| youloop | 5.2% | Moved | Static GitHub Pages deployment at `https://youloop.leftium.com`; shared loop parameters now load in the browser. |
| multi-launch | 3.1% | Convert, then move | Current server load/actions only handle cookies, form actions, redirects, and URL state. Recreate those in the browser first. |
| leftium-logo | 3.0% | Move | Static demo/library site. Icon lookup requests happen in the browser. |
| gg | 2.3% | Move | The deployed site is a static demo/docs surface. Local development logging endpoints are not production requirements. |
| doggo | 1.8% | Move | Static content/proposal site. |
| rift-transcription | 1.7% | Move | Connects from the browser to a local or Deepgram WebSocket; it does not need a Vercel runtime. |
| p5-kit | 1.3% | Move | Fully client/static. |
| create-cloudflare | 0.6% | Move | The local starter copy has no application server behavior. |
| kit-demos | 0.2% | Do not deploy to GitHub Pages | This is a SvelteKit bug-demo repository. Minimal reproductions must stay minimal and must not add GitHub Pages deployment configuration. |
| inspect-kit | 0.1% | Do not prioritize | Its purpose is inspecting server request, platform, cookies, and client address data. A static version would intentionally change that purpose. |
| sveltesociety-dev-migration-tools | 0.2% | Move if retained | Static bundled data plus browser-side GitHub requests. Its source is archived. |

## Migration order

1. Rename `static` to `fx`, move `fx`, then confirm the workflow and custom-domain pattern at `fx.leftium.com`.
2. Move `leftium-logo`, `gg`, `doggo`, `rift-transcription`, and `p5-kit` as independent small changes. `youloop` is complete.
3. Move `create-cloudflare` and `sveltesociety-dev-migration-tools` only if their deployments remain useful. Do not add a GitHub Pages workflow to `kit-demos`.
4. Decide whether the 3.1% CPU usage of `multi-launch` justifies its client-side rewrite.
5. Leave `veneer`, `hn`, and `weather-sense` on a server-capable host. Any work to make them static would be a product redesign, not a deployment change.

## Existing GitHub Pages deployments

The scan covered GitHub Actions workflow YAML files under `/Volumes/p`, skipping directories whose names begin with `_` and excluding `node_modules`. A project counts here when its workflow uses GitHub Pages actions such as `upload-pages-artifact` and `deploy-pages`.

| Project | Workflow | Published output | Notes |
| --- | --- | --- | --- |
| `pH` | `pH/.github/workflows/pages.yml` | `build` | Most recent and best reference. It installs with pnpm, checks, tests, builds, uploads, and deploys on `main`. |
| `LEFTIUM/leftium.github.io` | `LEFTIUM/leftium.github.io/.github/workflows/deploy.yml` | `build/` | Sets `BASE_PATH` for a repository-scoped Pages URL. |
| `LEFTIUM/robots-txt` | `LEFTIUM/robots-txt/.github/workflows/static.yml` | repository root | Static-only deployment. |
| `nimble.css` | `nimble.css/.github/workflows/pages.yml` | `_site` | Runs its custom build and assembles a site directory first. |

At the initial scan, none of the projects in the Vercel CPU screenshot had a GitHub Pages workflow. The later `fx` and `youloop` status entries above supersede that initial observation. `leftium.github.io` is distinct from `leftium-logo`.

## Public URL and custom-domain inventory

The current DNS inventory identifies candidate domains, but it does not make every domain the canonical production URL. Confirm the canonical URL for each project before creating its workflow, because the SvelteKit base path and alias handling depend on that choice.

| Project | Candidate custom domain | Canonical URL decision |
| --- | --- | --- |
| `fx` | `fx.leftium.com`, `static.leftium.com` | Choose one canonical domain. Rename repository from `static` to `fx` first. Redirect the other domain at the DNS provider or edge layer. |
| `youloop` | `youloop.leftium.com` | Complete: `https://youloop.leftium.com` is canonical and served from GitHub Pages. |
| `leftium-logo` | `logo.leftium.com` | Confirm whether this domain or `leftium.github.io/leftium-logo` is canonical. |
| `gg` | `gg.leftium.com` | Confirm whether this domain or `leftium.github.io/gg` is canonical. |
| `doggo` | `doggo.leftium.com` | Confirm whether this domain or `leftium.github.io/doggo` is canonical. `doggo-pitch.leftium.com` is separate unless it belongs to this project. |
| `p5-kit` | `p5.leftium.com` | Confirm whether this domain or `leftium.github.io/p5-kit` is canonical. |
| `multi-launch` | `multi-launch.leftium.com` | Confirm canonical URL if its client-side conversion proceeds. |
| `rift-transcription` | Unresolved | No matching domain appears in the supplied CNAME list. Confirm whether it should use `tt.leftium.com`, another listed domain, or `leftium.github.io/rift-transcription`. |
| `create-cloudflare` | Unresolved | Only migrate if the deployment remains useful and its target URL is known. |
| `sveltesociety-dev-migration-tools` | Unresolved | Only migrate if the deployment remains useful and its target URL is known. |

The remaining supplied CNAMEs are not evidence that their matching projects are in scope for this migration. They should retain their present host unless separately classified.

GitHub Pages permits one configured custom domain per Pages site. An alias such as `static.leftium.com` must not simply CNAME to the Pages host alongside `fx.leftium.com`: configure only the canonical domain in Pages, then use the DNS provider or edge layer to issue an HTTP redirect from every alias to the canonical URL. GitHub documents this requirement for multiple domains. [Troubleshooting custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)

## Additional hosted project: leftium.com

`LEFTIUM/leftium.com` is currently configured as a Cloudflare Worker through `wrangler.toml`. It should remain on Cloudflare Workers, not GitHub Pages.

Its contact feature has server loads and endpoints, uses private environment values such as `CONTACT_INFO_TOML` and `CONTACT_GRANT_SECRET`, and issues signed visitor grants plus authenticated admin sessions. Publishing it as static files would expose or remove the private-contact and access-control behavior.

## How to deploy a SvelteKit project to GitHub Pages

Use `pH` as the default pattern.

1. Confirm the site has no required request-time server execution, server actions, private environment variables at request time, or request-specific headers. Prerenderable server loads and endpoints are compatible if their output can be generated at build time. A GitHub Actions secret may be used to authenticate a build or deployment, but it must not be emitted into the public Pages artifact or be needed after that workflow has finished.
2. Add `@sveltejs/adapter-static` and configure it as the SvelteKit adapter. `pH` is the workflow reference; keep the adapter placement consistent with the SvelteKit version used by the project.
3. Ensure every route can be prerendered, preferably by enabling prerendering from the root layout so a non-prerenderable route fails the build. Verify the deployed host's route mapping: it may serve an extensionless `/route` from `route.html`, or require `trailingSlash: 'always'` to emit `/route/index.html`. Keep the form used by the generated navigation canonical. Use client-side data loading for data that must stay live after deployment.
4. Add `.github/workflows/pages.yml` based on `pH/.github/workflows/pages.yml`: install dependencies, run the project's relevant checks/tests, build, upload `build`, then deploy with `actions/deploy-pages`. Keep a manual `workflow_dispatch` trigger, least-privilege Pages permissions, separate build and deploy jobs, and the deploy job's `github-pages` environment URL. Use concurrency deliberately: cancelling superseded Pages runs is appropriate when only the newest commit matters; do not copy Cloudflare's non-cancelling production-deploy policy without a reason. The checked-in template uses `pnpm/setup@v2`, with explicit pnpm/runtime versions and `install: false` before a frozen-lockfile install. Align those inputs with the target project; do not copy them into a project using a different toolchain. See [pnpm setup inputs](https://github.com/pnpm/setup/tree/v2).
5. Validate the workflow's YAML before committing or pushing. GitHub Actions requires space indentation; tabs create an invalid workflow even if the structure looks right in review. Run the project's formatter and a YAML parser, for example `pnpm exec prettier --check .github/workflows/pages.yml` and `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/pages.yml')"`.
6. In the GitHub repository's Settings -> Pages, select `GitHub Actions` as the publishing source.
7. Choose the canonical production URL before building. For a custom domain, configure that one domain in GitHub Pages settings and keep SvelteKit's production base path empty. For a repository-scoped `leftium.github.io/<repository>/` URL, configure the matching SvelteKit base path and verify asset and navigation URLs. Custom Actions deployments ignore `CNAME` files; configure the domain in repository Pages settings instead. See [GitHub custom-domain configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
8. If a project has domain aliases, configure only its canonical domain in Pages. Redirect aliases at the DNS provider or edge layer, preserving the path and query string where possible.
9. Deploy the workflow, check the canonical Pages URL, test deep links and refreshes, then move the custom domain from Vercel only after the Pages version is working.

## Update public URL references

Do this for each project after choosing its canonical URL and before retiring the previous deployment.

1. Search the repository for the old Vercel URL, former custom domains, old repository name, and `github.io` URL. Update code-owned links and URL-bearing metadata: navigation and footer links, canonical and Open Graph metadata, web manifests, structured data, documentation, and package metadata such as `homepage`, `repository`, and `bugs` when present.
2. Update the repository README's live-site link and deployment instructions. If `static` is renamed to `fx`, also update repository-name references in documentation and source comments.
3. In the GitHub repository's About section, set the Website field to the canonical production URL. Review the description, topics, social-preview image, and pinned-repository/profile links only when they name the old URL or repository.
4. Search Leftium-owned sites, repository directories, and project indexes that link to the project. Update links that are under this migration's control; leave third-party links to the alias redirect.
5. After the redirect is live, use a focused search for the retired URL and old repository name. Record intentional historical references rather than rewriting changelogs, release notes, or archival material that accurately describe the old deployment.

## Retire the previous deployment

Do not delete a Vercel project or Cloudflare Worker before the Pages deployment is live and the domain has been checked.

1. Keep the old deployment available while the GitHub Pages URL is verified, including deep links, asset URLs, and the custom domain's HTTPS certificate.
2. If the canonical URL is a custom domain, configure it in GitHub Pages, then point its existing DNS record at the Pages site. Leave Cloudflare DNS in place if it is still the DNS provider; only remove the old host's route or custom-domain binding, not the zone. If aliases exist, install their redirects before removing the old binding.
3. Confirm the custom domain has a valid HTTPS certificate, production traffic reaches Pages, and the old deployment no longer receives the domain.
4. Disable future production deployments on the old host: disconnect or pause the Vercel Git integration, or remove the Cloudflare Worker route/custom-domain binding. Also remove any schedules, queues, or other triggers if the Worker uses them.
5. After an agreed observation period, delete the unused Vercel project or Worker and remove now-unused secrets and environment variables. Keep a record of the old domain and deployment name until the new deployment is stable.

`leftium.com` is not part of this retirement step. Its Worker is still required for the private contact and admin features.

## Completion criteria

- [ ] Each migrated SvelteKit project builds with the static adapter; other projects produce their native static output.
- [ ] Each workflow is valid YAML and uses spaces rather than tabs for indentation.
- [ ] Each workflow deploys the project's verified output directory through GitHub Pages.
- [ ] Root routes, deep links, assets, and client-side interactions work on the Pages URL.
- [ ] Each project's canonical URL works with the correct base path: domain root for a custom domain or `/repository/` for a repository-scoped Pages URL.
- [ ] Each canonical custom domain is configured in GitHub Pages, serves from its domain root, and has valid HTTPS before its previous binding is removed.
- [ ] Each alias custom domain redirects to the canonical URL before its previous binding is removed.
- [ ] Code, documentation, GitHub repository About metadata, and Leftium-owned project indexes link to the canonical URL or use an intentional alias.
- [ ] The old Vercel or Cloudflare deployment is disabled only after Pages has been verified.
- [ ] Vercel Fluid CPU usage falls after the migration batch is complete.

## References

- `pH/.github/workflows/pages.yml` - reference GitHub Actions deployment workflow.
- `pH/vite.config.ts` - reference static adapter configuration.
- `pH/README.md` - reference setup and base-path guidance.
- `LEFTIUM/leftium.com/wrangler.toml` - Cloudflare Worker configuration for leftium.com.
- `LEFTIUM/leftium.com/src/routes/(centered)/contact/+page.server.ts` - server-side contact behavior that prevents a static migration.
