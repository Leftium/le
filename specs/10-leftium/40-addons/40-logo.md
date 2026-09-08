# `logo` add-on

**Status:** Deferred design direction; not required for v0 or the creation milestone.

Generate assets locally from the owning renderer's native `LogoConfig`, then install them using the project's framework conventions. Share the renderer with `leftium-logo`/`logo.leftium.com` when a real library or CLI boundary is available; do not make normal generation depend on the website.

## Configuration and generation

Use a replaceable default visual preset until a project supplies custom configuration. Validate and persist imported native configuration so later runs do not need the original download. Custom visual input normally replaces the default rather than blending fields; explicit command input has highest precedence. The persistent filename, import flags, and exact replacement rules must be finalized with real renderer/consumer examples. `.leftium/logo.json` is a candidate path, not a fixed contract.

Pass distinct logo and favicon configurations through to the renderer intact. A favicon is not necessarily a resized logo. Keep visual input separate from application/download names and other non-visual output metadata. Do not introduce a second visual schema, a project-source category, or a mandatory `LogoKitOptions` wrapper.

The actual default visual preset remains to be supplied; conversation samples are fixtures, not defaults.

## Installation

Map public assets to native project locations, such as Kit's `static/` or Vite's `public/`. The historical sample pack included ICO/SVG favicons, Apple and 192/512 icons, PNG/WebP/SVG logos, a manifest, and integration markup. This is a fixture lead, not an exhaustive output contract; the original ZIP was not re-inspected.

Keep reproducible configuration separate from public output and identify which configuration regenerates the assets. Prefer generated assets suitable for committing so deployment does not require the generator; build-time generation remains possible. Leftium should not automatically commit files.

Update icon references and manifest icons without duplicating entries or replacing unrelated head/manifest fields. Preserve application identity; an emoji-derived kit name must not overwrite the app title. Use established project metadata for genuinely needed non-visual fields. Visual reproducibility does not imply byte-identical kit metadata.

## Design and verification gate

Inspect the current renderer schema and actual consumers before implementing. Verify config import/persistence, regeneration, distinct logo/favicon output, deterministic visuals, native output paths, preserved head/manifest content, and idempotent installation.

Paste/stdin input, self-contained share URLs, and a visual-editor "Copy le command" handoff are optional later UX. Resolve quoting and input validation before supporting them; a share link must not silently require hosted rendering.

Recovered evidence and sample provenance: [conversation supplement, SUP-024 through SUP-028](../../90-sources/10-conversation-supplement.md).
