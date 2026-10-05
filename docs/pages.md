# SvelteKit on GitHub Pages

`le add pages` prepares a standalone, fully prerendered SvelteKit app at its repository root. It configures adapter-static in the SvelteKit Vite plugin options or legacy svelte.config.js, adds root prerender/trailing-slash exports, and writes a thin `.github/workflows/pages.yml` caller. The CLI reports local configuration, static-build verification, and remote-deployment verification separately.

## Adoption

Declare `engines.node` and `packageManager` in the app's package.json, or pass their equivalent options. npm and pnpm are supported. pnpm needs an exact version; npm can use the version bundled with the selected Node release when no version is declared. Resolve competing lockfiles first.

```sh
le add pages --repository Ada/app --replace-adapter \
  --node-version 24 --package-manager pnpm --package-manager-version 12.3.4
```

`--replace-adapter` explicitly authorizes replacing adapter-auto. In a terminal, Leftium can ask for that choice. Other adapter migrations require manual setup. Without Git, pass `--repository-root .` as well as `--repository owner/repository`. `--cwd` selects the nearest package; generic add-ons retain their own targeting rules.

By default, Leftium runs installation, declared check/test scripts, and the build. It verifies static route files and local HTML asset references afterward. Installation updates the native lockfile; the shared workflow uses frozen-lockfile installation (`npm ci` or `pnpm install --frozen-lockfile`). Commit the consumer lockfile before running Actions. `--no-install` prepares files and reports the static build as skipped. A failed install or verification exits nonzero and reports remaining local effects.

For a project site, the canonical base is `/app`. For `Ada/ada.github.io` it is empty. For a custom domain, pass its HTTPS root URL:

```sh
le add pages --repository Ada/app --replace-adapter --site-url https://example.com/
```

An existing base must agree with that URL. A literal static adapter `pages` directory is preserved when assets share it; unknown paths or separate asset output require manual reconciliation. Existing CNAME content must agree with the selected domain and is preserved. Actions deployments ignore CNAME, so Leftium does not create one.

## Caller and shared workflow

The caller owns branch triggers, concurrency, permissions, and project inputs. The shared [Pages workflow](../.github/workflows/pages.yml) owns installation, optional checks/tests, build, artifact upload, and deployment. This keeps consumers from copying a deployment implementation that then drifts.

The caller must grant `contents: read`, `pages: write`, and `id-token: write`. Checkout reads the consumer repository; Pages uploads the build artifact; OIDC authorizes deployment. The deploy job uses the `github-pages` environment and reports its URL. Consumer branch rules and environment protection remain local decisions. The shared workflow runs only through `workflow_call` and does not enable Pages automatically.

Contract v1 accepts these string inputs:

| Input | Meaning |
| --- | --- |
| `app-directory` | App working directory; generated standalone callers use `.` |
| `package-manager` | `npm` or `pnpm` |
| `package-manager-version` | Exact declared tool version; required for pnpm |
| `node-version` | Project Node version/range |
| `build-script` | Package script name, normally `build` |
| `check-script`, `test-script` | Optional package script names; empty skips them |
| `publish-directory` | Artifact directory relative to the app, normally `build` |

Script names reach the shell through quoted environment variables, rather than being interpolated into shell source. A caller can keep customized check/test/build script names, branch triggers, comments, and extra jobs. Leftium updates the known workflow reference and fills missing inputs. It stops on unknown inputs, mismatched app/tool/output settings, competing deployment workflows, or unsupported YAML. It preserves unrelated Svelte/Vite settings using JavaScript syntax spans and YAML document edits.

## Version updates

Consumer references pin the shared workflow to a full Git commit SHA. The workflow revision is pushed before that SHA becomes the generator's default. GitHub can resolve that immutable revision without waiting for a mutable branch or tag to advance. These workflow pins have their own version contract; an npm package version does not select a workflow revision.

After reviewing a published workflow revision and its contract, update a caller with:

```sh
le add pages --workflow-ref Leftium/le/.github/workflows/pages.yml@FULL_40_CHARACTER_COMMIT_SHA
```

Reruns preserve supported caller customization and do not rewrite a caller that is already current. A contract change may require explicit input or app configuration migration; changing the SHA alone does not resolve such conflicts. Contract v1 adds the standalone npm/pnpm static-build and Actions deployment boundary. Cross-repository audits and automated migrations remain future work.

## Limits and troubleshooting

Workspace deployment, apps below the repository root, arbitrary adapters, dynamic Svelte configs, TypeScript-only config syntax, custom source directories, separate asset output, and SPA fallbacks require manual setup. The workflow exposes app-directory for its contract, but Leftium generates only the standalone configuration verified here.

The current sv template uses JavaScript-compatible vite.config.ts options. Leftium edits those options in place. Legacy svelte.config.js remains supported; conflicting simultaneous inline and legacy configs require manual reconciliation. See the [SvelteKit Vite configuration API](https://svelte.dev/docs/kit/@sveltejs-kit-vite).

Inspection rejects known request-time requirements, including actions, cookies/locals, request headers, runtime private environment access, and server hooks. Server load code used only during prerendering is allowed. Inspection is conservative and cannot prove arbitrary source code static; a successful strict adapter build and output checks provide the verification. Dynamic route entries are governed by SvelteKit's strict prerendering. Configure their entries manually when necessary.

If build verification reports missing routes or assets, check route prerender settings and base-aware links. `trailingSlash = 'always'` produces directory indexes that GitHub Pages can serve. Raw absolute asset links must include the project base; relative links or SvelteKit's path helpers avoid hardcoding that base. Leftium does not rewrite application content to guess its intended links.

Enable Pages with source **GitHub Actions** in repository settings, then push the consumer changes and run the workflow. For a custom domain, configure repository Pages settings and DNS manually. Additional aliases need HTTP redirects. Check deployed routes and assets, update URL references, and retire the previous host explicitly. Local fixture verification does not claim a deployed consumer, remote DNS, or Pages configuration has been verified.
