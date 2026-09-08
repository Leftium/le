# Project creation

**Status:** Draft; first milestone after the three-add-on v0.

`le create` uses an upstream creator to establish a project, runs the existing add-on pipeline, and records enough resolved input to recreate that starting point. The first backend is `sv`; additional backends wait until this integration demonstrates the boundary.

## Execution contract

```text
resolve destination, creator/template, options and versions
  -> resolve add-ons, presets, inputs and dependencies
  -> finalize and report plan
  -> scaffold base project
  -> inspect actual capabilities and reconcile add-ons
  -> install dependencies
  -> verify and record recipe
```

Resolve all knowable choices before significant mutation. Creation-time capability predictions are provisional until the generated project can be inspected. Apply the same preservation, conflict, dependency-ordering, and idempotency rules as `le add`; do not build a second transform system.

Prefer one final dependency installation when the creator and add-ons support deferral. Record unavoidable earlier installs in the plan. Preserve package-manager selection and lockfile behavior from the CLI spec. A supported no-install path should report skipped install-dependent verification and the command needed to finish setup.

Use a missing or empty destination. Refuse a nonempty destination, including `.`, before scaffolding; `add` is the supported path for existing projects. Do not overwrite unrelated files or promise atomic rollback across external tools. On failure, stop dependent work, report completed steps and remaining files, and provide recovery instructions. Never recursively delete a destination as implicit cleanup. A failed run must not emit a successful-creation claim.

These destination and failure rules are v2 design choices that keep initial creation reviewable without requiring a transaction framework.

## Inputs and interaction

Interactive selection and command-line arguments resolve into the same internal plan. The prompt sequence follows creator, template, creator-specific options, add-ons and their required choices, then installation choices. Explicit inputs avoid prompts; missing inputs in non-interactive mode fail with instructions.

Working command shape:

```sh
le create my-app --template sv:minimal --add license --add gitattributes
```

This illustrates composition, not a complete replay command. Before shipping, settle how the command represents language, installation policy, per-add-on options and presets, and creator/template versions. The grammar must be deterministic, shell-friendly, readable, and able to represent every supported prompt answer. Avoid a miniature command language embedded in `--add`.

User defaults and named creation presets are later conveniences. When introduced, they follow normal scope precedence and expand into explicit recipe inputs. They do not require a desired-state file.

## Recipe contract

The primary human-readable recipe is an executable, non-interactive `leftium create` command. Pin the actual Leftium release in the invocation and record:

- Creator/template identity and resolved version or revision information where the creator supports it.
- Creator choices and all selected add-ons, including their required options, presets, and dependency-relevant choices.
- Package manager and installation policy, with version information when needed for repeatability.
- Resolved values previously supplied by prompts, defaults, or named presets, including values such as license author/year that would otherwise be inferred again.

The serializer must quote arguments safely and round-trip supported values. Do not record only a mutable shorthand such as `--preset leftium-kit`. Do not embed authentication credentials in a README; if an input requires private access, document the prerequisite separately.

The preferred location is a clearly identified section in the generated README, preserving upstream instructions and unrelated content. Define section ownership and collision behavior before implementing insertion; replace only an unambiguously owned recipe section. Keep the recipe as original-creation history when later `add` operations run.

A recipe is not a lockfile, backup, or promise of byte-identical dependencies. Identify mutable or unpinnable upstream inputs and state the resulting reproducibility limit. Capture actual resolved inputs rather than inventing version guarantees. A separate machine-readable recipe is deferred until a consumer needs it.

For a preset whose content is not fixed by the pinned Leftium release, record immutable source identity or expand the effective values into the recipe. A local filename or mutable preset name alone is insufficient. If an upstream add-on cannot expose enough input for replay, identify that limitation rather than claim complete reproduction. The initial creation milestone may reject such inputs before scaffolding instead of adding remote-source machinery.

## Implementation gates and sequence

1. Inspect the selected `sv` release for public creation/add APIs, template choices, install control, and version resolution. Establish a compatible dependency and a minimal creation fixture before designing a generic creator interface.
2. Finalize option scoping and serialization with round-trip examples: a minimal project, multiple official/Leftium add-ons, and a configured add-on requiring non-default values. This is required before calling a recipe complete.
3. Implement preflight resolution, destination checks, shared add-on execution, and coordinated installation. Report any upstream limitation that prevents a single install or full preflight.
4. Define README ownership and implement recipe insertion, preserving upstream content.
5. Verify recreation in a fresh destination and failure behavior before adding other creators.

API signatures, exact flags, and README markers are implementation decisions at these gates. A public third-party creator SDK is not required.

## Acceptance

- Interactive and explicit equivalent inputs yield equivalent resolved plans.
- A Svelte project can be created with official Svelte and Leftium add-ons through the shared pipeline.
- Add-ons remain usable on existing projects; repeat application makes no unnecessary changes.
- Unknown inputs and nonempty destinations fail before avoidable mutation; later failures identify partial work accurately.
- Installation happens once when every selected operation supports deferral; exceptions are visible.
- The generated recipe runs without prompts in a fresh destination and reproduces the supported creation choices independently of changed user defaults.
- README content survives recipe insertion, and argument quoting preserves supported values.
- Verification distinguishes successful generation from checks skipped because dependencies were not installed.

## Later creators and templates

Aggregate upstream catalogs for discovery without mirroring their templates. Preserve creator-owned channels, template pins, and richer application patterns. Electrobun/Hutch and Vite are candidates, not committed support promises.

Separate acquisition of local directories, repository snapshots, refs/subdirectories, or archives from rendering and project transforms. Mine templates follow the [mine resolution model](50-resolution-and-mines.md). Converting an ordinary project into a reusable template, parameterized replay, and template-to-project updates are research directions; creation provenance leaves room for them but does not specify a merge engine.
