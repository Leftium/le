# Survey: Project Creation Tools Relevant to `le create`

> Archived design input, integrated into [spec v2](../10-leftium/00-spec.md). The [integration map](../10-leftium/90-influences.md#integration-disposition) records adopted and deferred ideas. Historical proposals below do not override the active spec.

This survey captures ideas from existing project-creation and template systems that may be useful when designing `le create`.

## Core references

### Svelte `sv create` / `sv add`

Closest architectural reference.

Key ideas:

- Separate **project creation** from **add-ons**, while allowing them to compose.
- `create` can invoke multiple add-ons during initial project generation.
- Add-ons can have their own options.
- Add-ons are transformations rather than whole project templates.
- The same add-on system works both during creation and later on existing projects.
- Supports authoring custom/local add-ons.

Potential `le` takeaway:

```text
le create <preset>
le add <addon>
le create <preset> --add <addon>
```

Prefer reusing the same add-on machinery for both `create` and `add`.

---

### create-t3-app

Strong example of **compositional project generation**.

Key ideas:

- Projects are built from orthogonal feature choices rather than a large matrix of static templates.
- Features such as database, auth, API layer, etc. compose into one generated project.
- Interactive questions and CLI flags represent the same underlying configuration.

Potential `le` takeaway:

A preset should ideally describe a composition:

```yaml
template: sveltekit
add:
  - prettier
  - vitest
  - drizzle
```

rather than require a separate static template for every combination.

---

### Astro

Useful distinction between **starter template** and **integrations**.

Key ideas:

- Project starts from a template.
- Integrations can be applied during creation.
- Templates may come from official examples or external GitHub repositories.

Potential `le` takeaway:

Keep these concepts separate:

```text
base template
+ transformations/add-ons
= generated project
```

---

### Nuxt

Good source of CLI ergonomics.

Notable features:

- `--modules`
- package-manager selection
- custom templates
- offline / prefer-offline modes
- shell selection
- interactive and non-interactive usage

Potential `le` takeaway:

Useful eventual CLI conveniences:

```text
--add
--package-manager
--offline
--no-install
```

---

### Electrobun / Hutch

Relevant because project starters can be selected from a catalog.

Key ideas:

- Discoverable template catalog.
- Interactive template selection.
- Direct template selection via CLI.
- Stable/beta template channels.
- Ability to pin exact toolchain/template versions.
- `--skip-install`.

Potential `le` takeaway:

Presets could eventually be discoverable independently of the `le` CLI release itself.

---

## Template-source systems

### Remix / React Router

Strong model for flexible template addressing.

Templates may come from:

- GitHub repositories
- repository subdirectories
- branches/tags
- remote archives
- local directories

Potential `le` takeaway:

Eventually support a flexible source grammar such as:

```text
le create github:user/repo
le create github:user/repo/path
le create ./local-template
```

---

### `giget`

Useful lower-level reference for fetching templates.

Features include:

- GitHub/GitLab/etc.
- refs and subdirectories
- caching
- offline operation
- private repositories
- custom registries
- downloading snapshots without preserving Git history

Potential `le` takeaway:

Template acquisition should be separable from project transformation logic.

---

### `degit`

Minimal ancestor of many repository-as-template workflows.

Interesting features:

- Repository snapshot without Git history.
- refs/subdirectories.
- caching.
- declarative post-copy operations such as:
  - additional sources
  - search/replace
  - file removal

Potential `le` takeaway:

Some simple preset operations may be declarative rather than implemented as arbitrary scripts.

---

## Parameterized template systems

### Cookiecutter

Important ideas:

- parameterized templates
- prompts
- hooks
- template inheritance
- replay files containing previous answers

The replay concept resembles a basic project preset.

Potential `le` takeaway:

Creation answers should be serializable and reproducible.

---

### Copier

Most interesting long-term lifecycle model.

Key idea:

A generated project remembers:

- source template
- template version
- previous answers

That allows an existing project to later incorporate changes from an updated template.

Potential future direction:

```text
le update
le sync
```

This does not need to be in the initial implementation, but `le create` should avoid architecture that makes it impossible.

---

## CLI UX references

### create-next-app

Useful interaction model:

```text
Recommended defaults
Use previous settings
Choose preset
Customize
```

Also supports a simple zero-interaction path such as `--yes`.

Potential `le` takeaway:

`le create` could eventually support:

```text
le create
le create --yes
le create --preset <name>
```

and optionally remember/reuse previous choices.

---

### Tauri `create-tauri-app`

Good example of hierarchical prompts.

Choices reveal only relevant follow-up questions:

```text
language
  -> package manager
  -> framework
  -> framework variant
```

Potential `le` takeaway:

Avoid presenting users with one large flat configuration matrix.

---

### create-vue

Classic example of orthogonal feature selection:

- TypeScript
- router
- state management
- testing
- formatting
- linting

Potential `le` takeaway:

Favor independent capabilities/add-ons over combinatorial static templates.

---

### Vite `create-vite`

Useful simplicity baseline.

Key ideas:

- project name
- template
- `.` means current directory
- non-interactive mode
- minimal abstraction

Potential `le` takeaway:

Keep the common case extremely small even if advanced preset machinery exists underneath.

---

### Angular CLI

Useful source of secondary CLI features:

- `--dry-run`
- `--skip-install`
- `--skip-git`
- package-manager selection
- strictness/configuration flags

Potential `le` takeaway:

`--dry-run` could be especially useful once presets perform multiple transformations.

---

### Expo

Interesting distinction between:

- **templates** — starting foundations
- **examples** — complete demonstrations

Also generates AI-agent guidance files in new projects.

Potential `le` takeaway:

Do not necessarily treat every reusable project as the same kind of preset. A future registry may distinguish starter templates from examples/reference projects.

---

## Historical reference: Create React App

CRA demonstrated the appeal of:

- one blessed command
- very few decisions
- hidden configuration

Its eventual deprecation also demonstrates the danger of tightly coupling generated projects to a monolithic toolchain abstraction.

Potential `le` takeaway:

`le create` should primarily produce ordinary projects rather than projects permanently dependent on `le`.

---

# Suggested conceptual model for `le`

The surveyed tools suggest four useful concepts:

## Template

Files/project structure used as the starting point.

```text
template = starting files
```

## Add-on

A transformation or capability that can be applied to a project.

```text
addon = project transformation
```

The same add-on should ideally work with both:

```text
le add
```

and:

```text
le create
```

## Preset

A reusable recipe containing some combination of:

```yaml
template:
add:
options:
```

For example:

```yaml
template: sveltekit

add:
  - prettier
  - vitest
  - drizzle

options:
  packageManager: pnpm
```

## Project

The materialized result of applying a preset.

```text
template + add-ons + options -> project
```

---

# Most relevant ideas for `le create`

The strongest ideas to carry into the `le` spec are:

1. **Reuse the existing `le add` transformation model inside `le create`.**
2. **Treat presets as compositions, not merely static directories.**
3. **Keep templates, add-ons, and presets conceptually distinct.**
4. **Make interactive prompts and CLI flags map to the same serializable configuration.**
5. **Allow ordinary generated projects to become reusable project presets where practical.**
6. **Keep template fetching/source resolution separate from project transformation logic.**
7. **Design creation to be reproducible from a saved preset/config.**
8. **Keep the simple path simple despite supporting advanced composition.**
9. **Consider flexible external/local template sources later.**
10. **Leave room for future project/template updating similar to Copier, without requiring it initially.**

## Likely primary influences

For implementation/design priority:

```text
sv
  -> create/add composition

create-t3-app
  -> feature composition

Astro / Nuxt / Hutch
  -> CLI and template UX

giget / degit
  -> template acquisition

Cookiecutter / Copier
  -> reproducibility and lifecycle
```

The potentially distinctive `le` idea is that an ordinary project can itself serve as a reusable project preset, minimizing the distinction between **creating a project** and **authoring a starter**.
