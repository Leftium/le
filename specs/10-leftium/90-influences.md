# Influences and related projects

Leftium combines patterns that already work elsewhere. This list preserves that design lineage without making those projects part of the v0 contract.

## Direct influences

- `sv add`: small composable add-ons, add-on dependencies, shared project mutation utilities, and delegation to an established framework tool.
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
| `Leftium/starterkit-preset` | Future composite project presets |
| Proposed `pages-yml` repository | Reusable Pages workflow inside `Leftium/le` |

`starterkit-preset` composed `gitattributes-preset`, `vscode-preset`, CoffeeScript, Pug, and a Netlify adapter. It is the direct predecessor of a project preset that selects several configured add-ons. Leftium replaces its one-time starter-kit framing with add, check, and update lifecycle operations.

`gg` and `nimble.css` remain independent libraries. Leftium may contain installation and configuration recipes for them, but not their runtime code.

## Upstream tools to preserve

Leftium should wrap or augment good upstream tools rather than replace them:

- `sv` for Svelte add-ons;
- `pnpm create @knip/config` for Knip initialization;
- framework-native configuration and generators for Prettier, robots files, deployment, and other domains.

The rule is consistent: delegate when the upstream workflow is sufficient; compose with its public API when Leftium must add planning, presets, or reconciliation; implement directly only when no suitable upstream owner exists.
