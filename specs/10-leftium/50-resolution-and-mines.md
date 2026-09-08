# Resolution and mines

**Status:** Post-v0 architecture

Mines are repositories or packages that publish additional add-ons, presets, and Leftium/mine-owned templates. The model is recorded now so v0 can keep compatible boundaries; mine discovery and installation are not part of v0.

The name fits Leftium's element metaphor and avoids borrowing Homebrew's "tap" or Scoop's "bucket" terminology. It is shorter than the considered alternative, "quarry," while the CLI context resolves its ordinary-language ambiguity.

## Core mine

Built-in add-ons and presets behave as a bundled core mine. Users normally refer to its entries without qualification.

Treating built-ins as a mine keeps future third-party content on the same conceptual path without requiring remote infrastructure in v0.

## Future resolution

Adding a mine only makes its contents available. It must not install an add-on, apply a preset, change creation defaults, create a project, or otherwise change project behavior.

This mirrors package repositories: making a repository available is not the same as installing one of its packages. The separation keeps mine management safe and predictable.

Preset resolution should prefer explicit and local intent:

1. An explicitly qualified mine preset.
2. A project-local preset.
3. A user-local preset.
4. A core preset.
5. An error or ambiguity report.

Configured external mines should not silently win an unqualified collision. Require a qualified name and show the available candidates.

Local intent comes before convenience. Silent collision resolution would make the same short command change meaning when a mine is added or reordered.

The exact qualification syntax is unresolved. It should be chosen together with the mine manifest and local configuration formats.

A mine may contain add-on implementations, leaf or composite presets, compatibility metadata, and reusable templates or generators. Upstream catalogs stay with their creators; a mine should not mirror them simply for discovery.

Native-format presets should remain readable without a Leftium-specific schema. A mine or scoped `.leftium/` directory may organize them like this:

```text
.leftium/
  addons/
  gitattributes/
    nodiff.gitattributes
    eol.gitattributes
    leftium.preset.yml
  robots/
    no-ai.txt
    private.txt
  presets/
    web.yml
```

Leaf files contain the target format. A small sidecar manifest is needed only for composition or metadata; a basic leaf preset should not require one.

Native files remain easy to inspect, edit, and reuse without Leftium. Sidecar metadata exists only where the native format cannot express relationships such as composition.

Remote content must be pinned or locked before Leftium can promise reproducible updates. Lockfile design is therefore deferred with remote mines.

## Provenance

Resolution should retain enough provenance to explain effective configuration:

```text
add-on:   gitattributes
presets:  nodiff (user mine), eol (core mine)
override: .leftium/gitattributes.override
```

A future `le why` command may expose this. v0 does not need to persist provenance, but its internal plan should avoid discarding source information unnecessarily.

Provenance becomes essential once the effective value may come from a composite preset, several scopes, an override, and a mine. Without it, users and agents would have to reconstruct resolution by hand.

## Acquisition and execution (deferred)

Keep fetching/catalog discovery, reading declarative native data, and executing add-on or template code distinct. Imported JavaScript/TypeScript executes code even if presented as configuration. Pinning identifies content; it does not establish trust. Expose code-executing steps and choose the trust mechanism before implementing external execution. No sandbox, signing system, or automatic trust policy is selected here.

Direct qualified remote inputs without prior mine registration are a candidate convenience. Choose their grammar together with mine identity, revision selection, local paths, and trust rules. Template qualification should follow explicit selection, ambiguity errors, and preserved provenance; the creator qualifier alone does not settle mine identity syntax.

Catalog refresh updates knowledge of available definitions; it must not update projects or their defaults. Define cache/offline behavior and unavailable-input errors with the first remote implementation. Test qualified and ambiguous names, refresh without mutation, pinned revisions, cached offline use, and missing cached content. Cache layout and lockfile schema remain open.
