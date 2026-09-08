# Influences and related projects

Leftium combines patterns that already work elsewhere. This list preserves that design lineage without making those projects part of the v0 contract.

## Direct influences

- `sv create` and `sv add`: creation/add-on composition and recorded recreation commands, plus small composable add-ons, add-on dependencies, shared project mutation utilities, and delegation to an established framework tool.
- [preset.dev](https://usepreset.dev/): reusable, repository-hosted file transforms applied with `npx apply`. Leftium's archived `vscode-preset`, `gitattributes-preset`, and `starterkit-preset` repositories used this model. They are direct predecessors of Leftium's native-format presets; `gitattributes-preset` is the clearest ancestor of the v0 `gitattributes` add-on.
- The earlier `svelte-add` ecosystem: composable commands that add one capability at a time instead of starting from a large template. Leftium contributed `coffeescript-adder` and `pug-adder`; that experience leads into the broader add-on model now represented by `sv`.
- Homebrew and Brewfiles: named sources, declared desired state, and an apply/reconcile workflow.
- Homebrew taps, Scoop buckets, APT repositories, and npm registries: the model for third-party Leftium "mines."
- Scoop: simple repository-backed collections of reusable definitions.
- Package managers generally: deterministic resolution, dependencies, provenance, locking, outdated checks, and updates.
- `Leftium/robots-txt`: reusable native-format presets and project-specific selection.

## Related Leftium projects

- `leftium-logo` and `logo.leftium.com`: motivate a shared local renderer that can serve both a web editor and the future `logo` add-on.
- `gg` and `nimble.css`: examples of standalone packages that should remain independent rather than move into the Leftium repository.
- `pH`: the current reference implementation for SvelteKit GitHub Pages configuration and deployment.
- `leftium.github.io`, `robots-txt`, and `nimble.css`: existing Pages deployments that informed the `pages` add-on and migration plan.

## Predecessor migrations

The earlier repositories have explicit destinations:

| Predecessor | Leftium destination |
| --- | --- |
| `Leftium/gitattributes-preset` | `le add gitattributes` |
| `Leftium/robots-txt` | Future `le add robots` |
| `Leftium/vscode-preset` | Possible future `le add vscode` |
| `Leftium/starterkit-preset` | Future creation defaults/macros and reusable add-on composition |
| Proposed `pages-yml` repository | Reusable Pages workflow inside `Leftium/le` |

`starterkit-preset` composed `gitattributes-preset`, `vscode-preset`, CoffeeScript, Pug, and a Netlify adapter. It motivates reusable selection of configured add-ons; v2 records creation through expanded recipes rather than a canonical project-preset schema. Leftium replaces its one-time starter-kit framing with add, check, and update lifecycle operations.

`gg` and `nimble.css` remain independent libraries. Leftium may contain installation and configuration recipes for them, but not their runtime code.

## Upstream tools to preserve

Leftium should wrap or augment good upstream tools rather than replace them:

- `sv` for Svelte add-ons;
- `pnpm create @knip/config` for Knip initialization;
- framework-native configuration and generators for Prettier, robots files, deployment, and other domains.

The rule is consistent: delegate when the upstream workflow is sufficient; compose with its public API when Leftium must add planning, presets, or reconciliation; implement directly only when no suitable upstream owner exists.

## Creation survey: retained lessons

The [supplied survey](../90-sources/30-creation-tools-survey.md) is design input, not verified current API documentation. Check primary upstream documentation and the selected release when implementing a backend. The newer create addendum takes precedence over the survey's suggested canonical project-preset schema.

| Research lead | Lesson retained in v2 |
| --- | --- |
| `sv` | Shared create/add pipeline; prefer public APIs for orchestration and retain upstream template ownership. |
| create-t3-app, create-vue | Compose independent features instead of maintaining a template for every combination. |
| Astro, Nuxt | Separate starters from integrations; keep installation and framework configuration coordinated. |
| Electrobun/Hutch | Browse minimal and substantial templates together; let the creator own channels and pins. |
| Remix/React Router, giget, degit | Separate snapshot acquisition, refs/subdirectories, caching, and local/remote sources from transformation. |
| Cookiecutter, Copier | Preserve resolved answers and source provenance; investigate parameterization and later template merging separately. |
| create-next-app, Tauri, Vite | Keep common creation short; ask hierarchical, relevant questions with equivalent explicit inputs. |
| Angular CLI | Consider preview, installation, and Git controls when the orchestration supports them honestly. |
| Expo | Starter/example classification and agent-guidance generation are optional discovery/setup ideas. |
| Create React App | Generate ordinary projects without a permanent dependency on Leftium orchestration. |

The survey's ordinary-project-as-template idea remains research. A coherent template need not be reduced to add-ons, and a recipe is a resolved creation record rather than a reusable preset schema.

Other historical leads include Nx/Codemod for transformations and migrations, shadcn for inspectable adoption into existing projects, Nix for profiles/rollback, and existing dependency-license scanners. These do not select dependencies or introduce new lifecycle guarantees.

## Integration disposition

The original [supplement](../90-sources/10-conversation-supplement.md) retains detailed evidence and conversation record references. This compact map records where its distinct ideas landed; historical drafts are not separate requirements.

| Source items | Integrated destination and status |
| --- | --- |
| SUP-001, SUP-002 | Git attributes and license specs: v0 behavior clarifications. |
| SUP-003 through SUP-005 | Architecture and CLI: pinned passthrough runtime, transform separation, delegation coverage, actionable output. |
| SUP-006 | Pages: adoption and workflow-maintenance documentation. |
| SUP-007 through SUP-014 | Roadmap: auditing, caller migrations, checks, freshness, holds, discovery, multi-add, and desired intent. |
| SUP-015 through SUP-017 | Resolution/mines: deferred execution trust, direct acquisition, refresh and offline behavior. |
| SUP-018 through SUP-023 | Roadmap: candidate setup details, tentative agent configuration, and deferred license review. |
| SUP-024 through SUP-028 | Deferred logo spec: config persistence/import, variants, asset installation, and identity preservation. |
| Supplement sections G/H | Retain current simplifications; merge already-covered ideas once. Rejected abstractions remain rejected. |
| Create addendum | Core model, architecture, CLI, and creation milestone; mine templates stay deferred. |
| Creation survey | Lessons above; canonical preset schema superseded by expanded recipes. Optional features stay on the roadmap. |

Do not restore mandatory reverse `sv` interoperability, a frozen upstream compatibility layer, a separate project-source category, logo-derived application names, an umbrella runtime-library repository, or a central consumer-version database. Those historical mechanisms were superseded while their useful workflows were retained.
