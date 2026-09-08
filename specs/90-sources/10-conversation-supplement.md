# Leftium: conversation supplement

> Archived design input, integrated into [spec v2](../10-leftium/00-spec.md). The [integration map](../10-leftium/90-influences.md#integration-disposition) records adopted and deferred ideas. Historical proposals below do not override the active spec.

**Status:** Non-normative integration backlog. Not an extension of the v0 contract.
**Prepared:** 2026-09-08.
**Source location:** `specs/90-sources/10-conversation-supplement.md`.
**Baseline:** `Leftium/le` at `4675a304b0323dcf8ed349a3dd173a0fa6e71b87`.
**Conversation:** `specs/90-sources/leftium-conversation.json`, blob `301a074a898719f98d9ad5bb443ee0c9cff77e63`.

This document recovers useful details from the supplied conversation that are absent from, or only partly represented in, the current specification. It does **not** replace the reorganized specification, reproduce every historical draft, or promote every assistant suggestion into a decision.

The comparison covers all ten documents under `specs/10-leftium/`, plus the Pages migration plan and its workflow template. A requirement already present in any of those documents is treated as covered. The current documents remain authoritative until a supplement item is explicitly merged.

## How to use this supplement

Each `SUP-...` item gives the source evidence, the actual difference from the baseline, a suggested destination, and proposed integration wording or review questions. **Proposed wording and verification ideas are this audit's synthesis**, not verbatim recovered requirements or evidence of earlier approval. Command examples outside the current CLI contract remain proposals.

Evidence is distinguished as **user request**, **assistant proposal**, or **mixed**. An approving conversational response is not treated as blanket approval of every implementation detail in the preceding answer. "Missing" means missing from the compared documents, not necessarily accidentally omitted.

For integration, review each item as **merge**, **retain as context**, **defer**, or **discard**. Keep future features in the roadmap until separately designed. In particular, this file does not add mines, project configuration, diagnostic aggregation, license analysis, or logo generation to v0.

## Source audit and limitations

The supplied JSON contains **56 captured records: 28 user and 28 assistant records**. All 56 were reviewed. References `C00` through `C55` are **zero-based JSON array indices**, not original chat turn numbers. Each links to the exact record at the pinned commit; the coverage ledger includes a searchable text anchor.

The capture order is not conversation chronology. After the opening Pages exchange, records `C02-C07` contain late logo/final-export material; the broader design discussion resumes at `C08`. The final array entry asks about spec updates, while a relevant answer is captured at `C03`. Do not infer decision order merely from increasing array indices.

The extract contains flattened rendered text, citation-label debris, and repeated specification prose. The long drafts in `C23`, `C39`, and `C45`, and the logo update in `C03`, were compared by meaning rather than counted as independent decisions. The file does not supply original message IDs, timestamps, branches, or attachment bytes. `C07` is a download pointer, not the downloaded specification itself.

This audit covers **the entire supplied extract**, not a certified complete original conversation. Historical assertions about upstream APIs, repository contents, package versions, websites, and legal-analysis tools were not re-verified. Their source is the conversation; they are identified below as research leads or historical observations, not current external facts. In particular, the sample logo ZIP was not re-inspected during this pass.

## Review map

| Area | Items | Recommended treatment |
| --- | --- | --- |
| Existing v0 behavior and implementation boundaries | SUP-001 to SUP-005 | Review as clarifications; do not add new subsystems. |
| Pages documentation, auditing, and upgrades | SUP-006 to SUP-008 | Preserve the original operational goals; scanning and upgrades remain deferred. |
| Diagnostics and lifecycle commands | SUP-009 to SUP-014 | Roadmap details, not v0 requirements. |
| Mine acquisition and trust | SUP-015 to SUP-017 | Design alongside the existing post-v0 mine model. |
| Deferred add-on behavior | SUP-018 to SUP-023 | Add focused roadmap notes or future sub-specs. |
| Logo generation and installation | SUP-024 to SUP-028 | Retain as an early post-v0 candidate; keep the upstream visual schema intact. |

The most consequential gaps are the `nodiff` Git-configuration responsibility, the original cross-repository auditing goal, the proposed project-health check policy, the explicitly deferred dependency-license review feature, the mine execution trust boundary, and the detailed logo installation contract.

# A. Clarifications to existing behavior

## SUP-001 - Define the `nodiff` Git-configuration responsibility

**Disposition:** Partially covered; potential v0 clarification.
**Evidence:** User goal plus assistant implementation observation. [C26], [C11], [C23].
**Suggested destination:** `40-addons/20-gitattributes.md`, command behavior and verification.

The current [Git attributes spec][S42] describes native rules using `diff=nodiff` and promises that machine-generated text will not clutter ordinary diffs. The conversation's predecessor inventory also says the old preset configured **Git settings**, not only `.gitattributes`. The early draft explicitly allowed related Git configuration. That responsibility is not addressed in the current add-on spec.

**Proposed integration:** Decide which related diff-driver settings the add-on must inspect or establish to deliver its promised behavior. Preserve an existing custom configuration or report a conflict. Do not silently broaden a project-local operation into a change to the user's global Git preferences. The exact driver command and supported diff-tool behavior need implementation evidence, not blind reuse of an old preset.

**Verification:** Test the resulting diff behavior as well as file contents: generated files remain tracked and retain the intended text treatment, their contents are suppressed where promised, an existing driver is respected, and a second run is unchanged. The project-local safety wording is a proposed clarification, not a recovered choice of implementation.

## SUP-002 - Detect alternate license filenames and report metadata disagreements

**Disposition:** Partially covered; potential v0 clarification.
**Evidence:** Assistant proposal supporting the user's simple license add-on request. [C32], [C33].
**Suggested destination:** `40-addons/10-license.md`, behavior and verification.

The [license spec][S41] already protects different or customized license text and limits changes to `package.json`. The conversation is more specific about looking for `LICENSE`, `LICENSE.md`, or similar existing files, and **reporting disagreement between the license file and package metadata**.

**Proposed integration:** Inspect existing conventional license files before creating another one. When the selected/file license and `package.json#license` disagree, explain the mismatch rather than leaving the user to infer it from an unchanged field. Any resolution must obey the existing conflict/confirmation rules.

Add a fixture for an existing alternate filename and one for a file/metadata mismatch. This does not reopen the current MIT default, require every proposed license template in v0, or add dependency-license analysis to `add license`.

## SUP-003 - Pin the passthrough runtime and test the breadth of `sv` delegation

**Disposition:** Partially covered; implementation decision to clarify.
**Evidence:** User interoperability goal plus assistant recommendations. [C16], [C20], [C21], [C25].
**Suggested destination:** `20-architecture.md` and `30-cli.md`.

The baseline already covers spawn-versus-import, provider collisions, `sv:` qualification, argument forwarding, and exit status. Its known-compatible-version requirement is most explicit for **imported composition**. The conversation also recommends invoking a known installed/pinned copy of `sv` for **pure passthrough**, rather than downloading an arbitrary version during a run. [CLI][S30], [architecture][S20].

**Proposed integration:** State how the subprocess's `sv` version is selected and installed. Decide explicitly whether passthrough uses the same known-compatible dependency; avoid an accidental distinction where imports are controlled but subprocess resolution is not.

The original compatibility examples extend beyond one official add-on: scoped community packages, explicit `sv:` selection, local `file:` add-ons, and Svelte projects that are not Kit. Preserve those as **delegation test cases**, with exact upstream syntax checked when implemented. Let upstream determine add-on-specific applicability rather than duplicating its resolver or rejecting every non-Kit Svelte project.

## SUP-004 - Keep content transforms testable independently of orchestration

**Disposition:** Partially covered; architectural rationale and testing detail.
**Evidence:** Assistant proposals. [C17], [C23].
**Suggested destination:** `20-architecture.md`, shared utilities and testing.

The baseline has shared project/file utilities and a small add-on lifecycle. The conversation additionally separates content-to-content transforms from filesystem access, package operations, prompting, and subprocess execution. It also recommends testing the **resulting project** for delegated setup rather than reproducing upstream unit tests. [Architecture][S20].

**Proposed integration:** Keep deterministic transformations independently callable and testable where practical. Orchestration decides what to read or execute; transforms operate on content. This is an internal separation, not a requirement for a new package, frozen compatibility wrapper, or a public API that differs from `sv`.

Use unit tests for Leftium's transformation logic and fixtures/integration tests for the resulting upstream-augmented project. Preserve the current preference for a single initial package and interfaces learned from actual implementations.

## SUP-005 - Specify actionable errors and restrained terminal output

**Disposition:** Missing presentation detail; small clarification.
**Evidence:** Assistant draft proposal. [C23]; limited-metaphor rule in [C45].
**Suggested destination:** `30-cli.md`, automation/output behavior.

The current [CLI spec][S30] requires useful reporting but does not retain the draft's concrete error contract: explain **what was attempted, why it failed, and what to do next**. The draft also discourages default stack traces and decorative branding.

**Proposed integration:** Expected user/configuration failures should include an actionable next step, such as an unresolved input and how to supply it. Keep normal output concise; reserve implementation traces for an explicit diagnostic path. The exact debug mechanism remains undecided. Do not change the existing requirement to preserve an upstream exit status or obscure which tool handled a delegated operation.

# B. Pages: preserve the original operational goals

## SUP-006 - Document the workflow for both humans and coding agents

**Disposition:** Partially covered; original user requirement worth retaining.
**Evidence:** Explicit user request and assistant elaboration. [C00], [C01], [C08], [C09].
**Suggested destination:** Pages documentation referenced from `40-addons/30-pages.md`.

The original request was not simply to install a workflow: it asked for documentation explaining deployment and **what each part of the workflow does**, for both humans and agents. The [migration plan][M10] contains operational setup guidance; the [product spec][S43] describes ownership. Neither fully preserves the proposed reusable-workflow maintenance documentation contract.

**Proposed integration:** Provide a documented adoption/update path, workflow anatomy, reasons for non-obvious settings, supported customization boundaries, version/change notes, migration instructions, and troubleshooting. Documentation should identify which behavior belongs in the shared workflow and which choices remain with the caller, including locally visible permissions and project-specific inputs.

A short generated comment can identify the owning Leftium documentation and explain that the caller is intentionally thin. This should prevent an agent from "simplifying" the setup by copying the shared implementation back into every consumer. Do not require the earlier standalone `pages-yml` repository, copied updater script, or an additional version registry.

## SUP-007 - Restore the cross-repository adoption and version-audit use case

**Disposition:** Missing roadmap detail; explicitly post-v0.
**Evidence:** Original user goal and later dashboard discussion. [C00], [C08], [C09], [C23].
**Suggested destination:** `60-roadmap.md`, project scanning/auditing.

The overview excludes project scanning from v0, but the [roadmap][S60] does not explain its intended outcome: **which repositories use the convention, which version each uses, and which consumers need attention**. This was one of the initiating requirements, not a later generic package-manager embellishment.

**Proposed integration:** A future read-only scanner may derive a consumer report from actual repository configuration. For Pages, the caller's workflow reference is the primary version evidence; package-backed integrations have their own native evidence. A GitHub Project, wiki, or generated report is a view, not a second authoritative installation database.

The report can distinguish a detected version, an available update, missing integration, and an uninspectable/unknown repository. Exact discovery scope, command name, authentication, and update mechanism remain undecided. Historical project names in examples are not a freshly verified inventory.

## SUP-008 - Treat caller migration as distinct from changing a workflow reference

**Disposition:** Partially covered; deferred upgrade detail.
**Evidence:** Assistant proposals tied to the original version-maintenance goal. [C09], [C23], [C25].
**Suggested destination:** `60-roadmap.md` and a future Pages migration/update sub-spec.

The current Pages spec centralizes implementation and pins the caller's reference. The conversation also describes an updater preserving branch, output directory, package manager, and build choices while **migrating the caller itself**. Its examples include renamed inputs, changed local configuration, and removal of obsolete managed configuration. [Pages][S43], [roadmap][S60].

**Proposed integration:** An update may need to migrate a caller contract as well as select a newer reusable implementation. Determine the current reference, inspect local customization, consult the relevant change/migration instructions, and preserve supported project-specific settings. A version bump alone must not be assumed to implement every required migration.

Keep permissions and other caller-owned decisions inspectable locally. The exact version policy and migration format remain open; do not invent a separate per-add-on version database before actual differences require it. The current operational workflow template remains reference material, not the reusable workflow's final interface.

# C. Diagnostics and lifecycle roadmap

## SUP-009 - Recover the proposed `check` selection policy

**Disposition:** Partially covered; substantial missing roadmap behavior.
**Evidence:** User request plus assistant recommendation. [C24], [C25], [C39], [C45].
**Suggested destination:** `60-roadmap.md`, commands, then a dedicated `check` sub-spec.

The baseline distinguishes `check`, `outdated`, and `doctor`, but does not retain the proposed aggregation policy. The discussion describes validating Leftium-managed configuration **and delegating to existing project diagnostic tools**. [Roadmap][S60].

**Recovered proposal:** Prefer a project's existing `check` script when present; consider an upstream Svelte diagnostic fallback for a compatible project without that script; run configured lint, Prettier checks, and Knip when applicable. Do not assume one upstream command implicitly runs all project check/lint scripts. Tests should not run by default merely because they exist: the conversation notes their cost, service requirements, and possible side effects.

**Integration questions:** How are overlapping checks deduplicated? What is opt-in? How are unavailable tools, findings, and execution failures distinguished? How are statuses aggregated without hiding native details? Keep freshness primarily under `outdated`; the old illustrative output sometimes mixed the two despite explicitly discussing their separation. No current upstream CLI behavior is certified by this recovery.

## SUP-010 - Distinguish versioned inputs, convention migrations, and reconciliation

**Disposition:** Partially covered; unresolved semantics with recovered examples.
**Evidence:** User analogy to package-manager updates; assistant proposals. [C24], [C25], [C23], [C45].
**Suggested destination:** `60-roadmap.md`, `outdated` and `update`.

The baseline correctly avoids indiscriminate dependency upgrades. The discussion adds three concrete cases: a Pages workflow reference, a package-backed integration such as `gg` with potentially separate package/configuration evolution, and an unversioned convention such as Git attributes that can be reconciled without inventing a version number. [Roadmap][S60].

**Proposed integration:** Define what "current" and "outdated" mean for each supported input type. Keep inspection non-mutating. Distinguish an upstream dependency upgrade from a Leftium integration migration; they can be independent. For unversioned inputs, report observable drift or unresolved freshness rather than fabricate a numeric version.

Range-respecting updates versus an explicit `--latest`-style escape hatch were suggested, not finalized. Likewise, selecting a single add-on for `outdated` or `update` was illustrated. Retain these as decisions for the lifecycle spec, not implemented CLI promises.

## SUP-011 - Preserve pin/hold behavior as a separate idea from locking

**Disposition:** Missing, speculative post-v0 feature.
**Evidence:** Assistant proposal. [C27].
**Suggested destination:** `60-roadmap.md`, lifecycle ideas.

The conversation proposes `le pin pages` and an outdated report that still shows a newer version while marking the integration as pinned. There is no corresponding item in the current roadmap.

**Recovered distinction:** A lock records a resolved input for reproducibility; a hold expresses a user's wish not to upgrade that integration. Those are different intentions. Preserve the use case of an older project intentionally staying on an older convention.

The command names (`pin`/`unpin` or another form), persistence, interaction with `update --latest`, and allowed overrides are unresolved. Do not add this machinery to v0 or interpret existing lockfile plans as automatically specifying hold behavior.

## SUP-012 - Retain discovery and inspection commands beyond `why`

**Disposition:** Missing optional command family.
**Evidence:** Assistant proposals and draft catalog. [C27], [C31], [C45].
**Suggested destination:** `60-roadmap.md`, discovery.

`why` is already covered. The conversation separately proposes `search`, `info`, and `list`: discover available integrations/presets, explain one, and list what is enabled in the current project. Example `info` fields include purpose, applicability, source, installed state, version when meaningful, and composition membership. [Resolution][S50], [roadmap][S60].

**Proposed integration:** Retain those three user questions without committing to every illustrated flag or output schema. Available catalog entries and enabled project entries must remain distinguishable. Source and composition explanations can share the provenance work already planned for `why` rather than create another metadata authority.

## SUP-013 - Preserve mixed multi-add-on requests as an optional extension

**Disposition:** Missing optional behavior; not a v0 completion criterion.
**Evidence:** Assistant proposals, with later drafts explicitly saying multiple add-ons MAY be supported. [C11], [C21], [C39], [C45].
**Suggested destination:** `60-roadmap.md`, then `30-cli.md` if accepted.

The current command contract is singular. The conversation repeatedly illustrates one request containing both Leftium and upstream add-ons, for example `le add gitattributes prettier tailwindcss knip`. It proposes one coherent provider-aware report, initially allowing sequential execution instead of designing a combined dependency system.

**Integration questions:** How are provider-specific options scoped? What ordering and deduplication are required? Does execution stop at the first failure, and what partial success is reported? Preserve the convenience goal without implying atomic rollback or a cross-provider dependency solver that the conversation never settled.

## SUP-014 - Decide how `add` records intent once desired-state configuration exists

**Disposition:** Partially covered; future behavior, not a reason to create configuration now.
**Evidence:** Assistant proposals. [C27], [C31].
**Suggested destination:** `60-roadmap.md`, desired-state workflow.

The baseline defines a future desired-state file and `apply`, but not whether `add` updates that declaration. The conversation proposes **add the requested integration to desired configuration and apply it**, while `apply` reconciles what is already declared. [Roadmap][S60].

**Proposed integration:** When a desired-state workflow is actually introduced, decide whether successful `add` operations persist selection and options, how one-off CLI overrides remain transient, and how failures affect the declaration. The transcript does not settle write ordering or transactional behavior.

Do not turn this proposal into mandatory `.leftium/config.ts` creation in v0, and do not copy detected installation state into it. The exact filename and format remain open in the baseline.

# D. Mine acquisition, execution, and reproducibility

## SUP-015 - Make the distinction between declarative input and executable code explicit

**Disposition:** Missing trust-boundary detail; post-v0.
**Evidence:** Assistant supply-chain warning. [C27].
**Suggested destination:** `50-resolution-and-mines.md`, trust and execution.

The baseline covers source selection and pinning, but not the conversation's explicit warning that an external source may contain **executable add-on code**, not just native data. A pinned revision identifies what will be used; it does not by itself decide whether that content should be trusted. [Resolution][S50].

**Proposed integration:** Distinguish fetching/discovering a mine, reading supported declarative presets, and executing its code. Make code-executing operations visible rather than letting the word "preset" obscure them. The authorization/trust mechanism remains a design question.

**Reconciliation note:** The old answer loosely groups a "data-only TS export" with JSON/YAML. Do not carry that phrase forward as a security guarantee. A future implementation must account for evaluation of imported JavaScript/TypeScript. This caution is integration analysis, not a recovered sandbox design. No sandbox, signing scheme, permission system, or automatic trust policy was agreed.

## SUP-016 - Consider fully qualified remote input without prior mine registration

**Disposition:** Missing optional acquisition workflow.
**Evidence:** Assistant proposal. [C27]; portable local/native input context in [C29].
**Suggested destination:** `50-resolution-and-mines.md`, acquisition and qualification.

The conversation suggests using an explicitly identified remote preset directly; registration would be a convenience for remembered names, discovery, and caching rather than a prerequisite for every one-off use. The baseline's qualified resolution does not settle whether that requires a previously configured mine. [Resolution][S50].

**Proposed integration:** Preserve the use case, but choose its syntax together with mine identity, revision selection, local-file handling, and trust behavior. The historical slash-separated examples should not be treated as an approved grammar. A direct reference must still satisfy whatever reproducibility and execution policies apply; it is not an exception to them.

## SUP-017 - Separate catalog refresh from project updates and retain offline test cases

**Disposition:** Partially covered; future mine operational details.
**Evidence:** Assistant lifecycle proposals and explicit draft test list. [C31], [C45].
**Suggested destination:** `50-resolution-and-mines.md` and future mine tests.

The discussion names `mine add/list/remove/update` and distinguishes source availability from project state. It also lists locked revisions and offline/cached behavior as test scenarios. The baseline preserves the conceptual distinction but not that operational test coverage. [Resolution][S50], [roadmap][S60].

**Proposed integration:** Define a catalog refresh separately from applying new definitions to a project. Refreshing knowledge of available versions should not silently modify a consumer. Specify what can run from a cache, how a locked input is resolved offline, and what happens when required content is unavailable.

Test qualification, short-name conflicts, refresh, revision selection, and offline/cache behavior when mines are implemented. Do not invent a cache directory, eviction policy, or lockfile schema now. The historical "optional lockfile later" sequencing does not override the current baseline's reproducibility condition for automated remote updates.

# E. Deferred add-ons

## SUP-018 - Retain concrete Prettier preferences, preservation tests, and the opt-out question

**Disposition:** Partially covered; post-v0 add-on detail.
**Evidence:** Explicit user preferences/use-by-others goals plus assistant proposals. [C12], [C24], [C25], [C17], [C23].
**Suggested destination:** Future Prettier sub-spec, linked from `60-roadmap.md`.

The baseline covers native configuration and replaceable presets. The conversation supplies the concrete concerns: semicolons, tabs/spaces, tab width, quotes, trailing commas, print width, and Svelte-specific setup. It also calls out preserving custom ignores and unrelated existing options. **No complete authoritative set of the user's preferred values is supplied.** [Core model][S10], [roadmap][S60].

**Proposed integration:** Separate correct project/framework setup from the selected formatting policy. Test applying the same policy in generic and Svelte projects, changing an explicit preference, preserving custom ignores, and idempotency. Use existing upstream setup where appropriate rather than copying its schema or installer.

An explicit no-opinion preset (`--preset none` in one example) was suggested. Decide whether it is useful alongside the existing raw `sv:` escape hatch; do not assume it is already part of the command contract or that an example `--semi false` establishes the default.

## SUP-019 - Specify Knip's post-install diagnostics separately from installation

**Disposition:** Partially covered; post-v0.
**Evidence:** User candidate add-on plus assistant workflow proposal. [C18], [C19], [C23].
**Suggested destination:** Future Knip sub-spec and `60-roadmap.md`.

The baseline says to use the official initializer and apply only necessary local configuration. The conversation adds detection of existing setup, a package-script check, an optional initial run, configuration-hint reporting, and future participation in `le check`. [Roadmap][S60].

**Proposed integration:** Distinguish setup success from diagnostic findings. Reuse upstream analysis and surface its results rather than implement dependency analysis in Leftium. Preserve existing setup and rerun only appropriate installation/reconciliation steps.

The old answer proposed both a `--run` form and making the initial run the default; that choice was never settled. Retain it as a decision, along with exit statuses and report aggregation. Verify the upstream initializer's current interface when implemented; historical tool/version assertions are not requirements.

## SUP-020 - Recover the robots migration's native-fragment and override requirements

**Disposition:** Partially covered; future migration detail.
**Evidence:** User predecessor/native-format requests plus assistant proposals. [C08], [C09], [C28], [C29], [C45].
**Suggested destination:** Future robots sub-spec, linked from `60-roadmap.md` and `90-influences.md`.

The baseline records the predecessor and defers detailed migration. The discussion already identifies useful inputs to that work: canonical base rules, optional additional native presets, project-specific override fragments, the current project's static/public location, and eventual replacement of copied updater scripts. [Influences][S90], [roadmap][S60].

**Proposed integration:** Preserve these behaviors while deciding the framework's actual representation. Native text should remain ergonomic input, but the merge must respect the domain rather than concatenate fragments blindly. Carry existing project exceptions forward when migrating.

Paths such as `.leftium/robots.override.txt` and presets such as `indexing`, `no-ai`, and `leftium` are historical proposals, not fixed policy. Inspect actual consumers before deciding merge/removal rules; do not delete customized scripts merely because the conversation expected the central CLI to replace their role.

## SUP-021 - Keep the concrete recipe boundaries for `gg`, `nimble`, and `vscode`

**Disposition:** Partially covered; historical implementation leads.
**Evidence:** User repository-exploration request and assistant inventory. [C10], [C11], [C23].
**Suggested destination:** Future add-on sub-specs; keep lineage in `90-influences.md`.

The current documents correctly keep runtime libraries independent and already list their migrations. The remaining useful details are the **specific setup surfaces** identified during research:

| Candidate | Historically discussed setup surfaces | Integration use |
| --- | --- | --- |
| `gg` | Install `@leftium/gg`; configure Vite using the then-mentioned `ggPlugins()`; optionally add a Svelte `GgConsole` component. | Coordinated multi-file setup is why the recipe was considered valuable. Preserve opt-in component integration and unrelated configuration. |
| `nimble` | Install the then-mentioned `@leftium/nimble.css`; add the appropriate stylesheet import; avoid duplicate imports. | A small framework-aware recipe, with lower initial priority because manual setup was already simple. |
| `vscode` | The older preset reportedly created `.vscode/launch.json` and adjusted `.gitignore`. | Inspect both debugging configuration and ignore rules rather than assuming the predecessor only wrote editor settings. |

These are **not verified current package APIs or an instruction to restore 2021 settings**. Re-inspect the owning repositories before implementation. Do not require support for every framework mentioned in brainstorming. The full predecessor inventory and the library-versus-recipe boundary are already covered in [influences][S90], so they are not new supplement requirements.

## SUP-022 - Retain shared agent configuration as an explicitly unapproved candidate

**Disposition:** Missing speculative add-on; post-v0 only.
**Evidence:** Assistant proposal, not a specific user commitment. [C11].
**Suggested destination:** `60-roadmap.md`, candidate add-ons or research backlog.

The conversation proposes a possible `agents` add-on for recurring configuration such as `AGENTS.md`, `.agents/skills/`, and `.agents/agents/`. Its motivation is the original maintenance problem: a convention improves in one repository while other projects retain older copies.

**Proposed integration:** Preserve the use case as a candidate, not an adopted layout or a universal standard across coding tools. Decide which files are actually shared and which are project-specific before designing any merge/update behavior. No particular provider format, agent-routing strategy, or automatic replacement policy was agreed.

## SUP-023 - Restore the explicitly deferred dependency-license review feature

**Disposition:** Missing substantive roadmap item; explicitly agreed to be post-v0.
**Evidence:** User request and explicit deferral; assistant scoping proposal. [C34], [C35], [C36], [C37].
**Suggested destination:** `60-roadmap.md`, with a separate future license-review sub-spec.

The current [license spec][S41] excludes detailed compatibility analysis from v0, but the [roadmap][S60] does not preserve the positive intent to explore it later. This is stronger evidence than a casual assistant-only suggestion: the user asks about dependency compatibility and then explicitly defers `license check` until after v0.

**Recovered scope:** Keep `add license` as the simple deterministic chore. A separate review command may delegate dependency-license inventory to an existing scanner, retain declared license expressions and unresolved cases, apply a selected policy, and report items requiring review. The conversation also proposes project-specific exceptions with a reason and provenance, plus eventual aggregation into `le check`.

**Boundary to retain:** This would be a policy/orchestration aid, not a proof of universal legal compatibility. The transcript discusses distribution context and dependency usage as relevant inputs; it does not establish a legal policy for this project. Do not turn its sample allow/review/deny tables into defaults or label every named license categorically safe/unsafe. Tool names in that research are leads to reassess, not selected dependencies.

# F. Logo: retain the detailed installation behavior without restoring removed abstractions

## SUP-024 - Specify project logo persistence and replacement of the default visual preset

**Disposition:** Partially covered; proposed post-v0 convention.
**Evidence:** User-provided JSON and reusable-default use case; assistant refinement. [C02], [C03], [C48], [C50].
**Suggested destination:** Future logo sub-spec; reference from `60-roadmap.md`.

The baseline says a project can use a default visual preset or custom `LogoConfig`. The conversation specifies a persistent project-local visual file, proposed as `.leftium/logo.json`, and says a custom configuration should normally **supersede** the reusable visual preset rather than require field-by-field blending. [Roadmap][S60], [core model][S10].

**Proposed integration:** Preserve the workflow: use the configured default until custom visual input is supplied; persist the custom input; subsequently regenerate from it; apply explicit command input according to a documented precedence rule. Decide the final filename alongside other `.leftium/` conventions.

Do not reintroduce "project source" as a distinct top-level kind of configuration. The current core model explicitly simplified it to ordinary add-on configuration. Also, the uploaded sample was **not** the user's default; the actual default visual configuration remains an input to obtain, not something to infer from the rocket or House Keys examples.

## SUP-025 - Recover the import workflow and visual-editor handoff

**Disposition:** Missing operational detail; optional extended UX.
**Evidence:** User logo-pack/config requests plus assistant proposal. [C46], [C48], [C49], [C03].
**Suggested destination:** Future logo sub-spec; any editor button belongs to `leftium-logo` separately.

The conversation proposes importing a config file, storing it in the project, generating assets, and wiring them into the application. Subsequent runs would not require the original download path. It also considers paste/stdin input and self-contained share URLs, plus a visual-editor **"Copy le command" / "Install with Leftium"** handoff.

**Proposed integration:** Start by documenting a native-config import path that validates input and persists it for repeatable local generation. Keep alternate input forms and editor-generated commands optional. Exact flags, shell quoting, encoding, and URL formats were never finalized.

A downloaded ZIP was the initial idea, not the preferred long-term source of truth. A share-link input should not silently change the existing architectural preference into a dependency on a hosted rendering service. The baseline's local shared-renderer direction remains authoritative. [Roadmap][S60].

## SUP-026 - Preserve dedicated favicon rendering rather than treating it as a resize

**Disposition:** Missing domain-specific behavior and test case.
**Evidence:** Concrete user JSON plus assistant interpretation. [C48], [C49].
**Suggested destination:** Future logo sub-spec and shared-renderer integration tests.

The user's example includes distinct `logo` and `favicon` configuration structures, with icon, colors, geometry, transforms, and grayscale-related fields. The discussion explicitly warns against assuming that a favicon is just a scaled full-size logo.

**Proposed integration:** Delegate the complete native configuration to the owning renderer without flattening variant-specific state or inventing a second schema in Leftium. Install the renderer's favicon outputs as such.

A useful **new test derived from that discussion** would intentionally make the full logo and favicon visually different and verify that the integration preserves both. The supplied rocket example is a source fixture, not the user's default and not, by itself, proof that all variant combinations are covered. Check current upstream schema/version behavior when implementing.

## SUP-027 - Preserve the sample pack mapping and deployment-independent generated assets

**Disposition:** Missing concrete output example and commit/default rationale.
**Evidence:** Historical assistant inspection report and generation proposal. [C50], [C49], [C03].
**Suggested destination:** Future logo sub-spec, output installation and fixtures.

The transcript reports the following sample layout; **the ZIP bytes were not re-inspected in this audit**:

```text
.logo/
  config.json
  favicon.htm
static/
  favicon.ico
  icon.svg
  apple-touch-icon.png
  icon-192.png
  icon-512.png
  logo.png
  logo.webp
  logo.svg
  manifest.webmanifest
```

**Recovered behavior:** Keep reproducible visual input separate from generated public assets. Map the logical public-asset root to the detected project convention, historically `static/` for Kit or `public/` for Vite. Use the markup/manifest material as integration input, not a reason to copy the pack wholesale into `.leftium/`.

The conversation favors committing generated assets by default so normal deployment does not need the logo generator. Treat this as a proposed default, not a ban on build-time generation. The exact output set belongs to `leftium-logo` and can evolve; the layout is a historical fixture candidate, not an exhaustive required bundle. The baseline already covers deterministic shared rendering. [Roadmap][S60].

## SUP-028 - Protect head/manifest content and distinguish visual reproducibility from whole-kit metadata

**Disposition:** Partially covered; domain-specific preservation rule.
**Evidence:** Explicit user clarifications and assistant correction. [C51], [C53], [C54], [C03].
**Suggested destination:** Future logo sub-spec, framework integration.

The baseline correctly keeps filename/download metadata outside visual configuration. The conversation adds a concrete consequence: **do not replace the application's identity with an emoji-derived kit name**. The sample reportedly included "House Keys" in non-visual output; that does not make it appropriate to overwrite an existing app title or manifest identity. [Roadmap][S60].

**Proposed integration:** Update logo/favicon references and relevant manifest icons while preserving unrelated head/manifest fields and avoiding duplicate references. Keep rendering separate from framework edits. Preserve an existing manifest, and use established project metadata if creating non-visual fields requires it; do not force new name fields into `LogoConfig` for installer convenience.

Visual reproducibility is not the same claim as reproducing every byte of a kit whose manifest or download name uses additional metadata. Any genuinely required output metadata can remain a separate input when a concrete use case exists. The proposed `LogoKitOptions` wrapper was explicitly deferred, not selected as a required schema.

# G. Changed directions and historical material not promoted

## Reconciliation decisions

| Historical proposal | Current treatment | Evidence |
| --- | --- | --- |
| Make the exact `sv` add-on contract mandatory and expose every Leftium add-on back through `sv`. | The important direction became using upstream add-ons through `le`; reverse interoperability is optional. Preserve the baseline's small `sv`-like shape and public-API reuse, not a requirement to emulate every internal API. | [C18], [C19], [C20], [C21]; [S20]. |
| Protect Leftium behind a permanently independent/stable wrapper around experimental upstream APIs. | Also not a settled requirement. The user expressed willingness to follow upstream changes. Pure-transform separation in SUP-004 must not be misread as reinstating a frozen compatibility layer. | [C17], [C18]; [S20]. |
| Introduce a separate top-level "project source" concept. | Do not restore it: project-local input is ordinary add-on configuration in the current core model. Preserve logo behavior, not the removed category. | [C03], [C05]; [S10]. |
| Treat logo presets only as installation bundles such as `web`, `pwa`, or `minimal`; reject visual presets. | Revised after the user described a reusable default logo. Keep visual presets primary. Separate installation-policy presets are a possible later need, not an established requirement. | [C49], [C02], [C50]; [S60]. |
| Add app/download names to the visual JSON, or infer actual app identity from the icon by default. | The user clarified the filename origin; the following recommendation kept visual JSON unchanged and protected existing app identity. | [C51], [C52], [C53], [C54]. |
| Move `gg`/`nimble.css` runtime code into the umbrella repository. | Already rejected in favor of installation recipes and independent packages. | [C10], [C11]; [S90]. |
| Keep standalone `pages-yml`, copied updater scripts, and an authoritative central consumer-version registry. | The unified CLI and derived native state supersede that proposed packaging. Preserve documentation/auditing goals, not those particular mechanisms. | [C08], [C09], [C11]; [S43], [S90]. |
| Make `le` primary with `@leftium/le` canonical; retain `source`/`tap`/`bucket`; start with a larger v0. | Current naming and v0 scope are authoritative. The MIT default is now explicit even though late conversation text left defaults open. These are not omissions to restore. | [C18], [C24], [C32], [C36], [C44]; [S00], [S30], [S41]. |

## Supporting research worth retaining, not treating as current documentation

The current influences file already covers the most important lineage: Preset, the older Svelte add-on ecosystem, the three predecessor preset repositories, the `starterkit-preset` composition, `robots-txt`, `sv`, and package-manager concepts. The remaining comparison leads are compact enough to retain without reproducing the old research answer. [C11], [C31]; [S90].

| Historical lead | Question it helped frame |
| --- | --- |
| Astro/Nuxt add commands | Can installing a dependency and updating framework configuration be one integration operation? |
| Nx generators / Codemod Registry | How should structured transformations and migrations be distributed and reused? |
| shadcn-style CLI/registry interactions | How can users inspect proposed file changes and adopt something into an existing project? |
| Nix profiles/generations | Could named personal profiles or rollback eventually help? This remained speculative, not a chosen lifecycle design. |
| Existing dependency-license inventory/review tools | What can Leftium delegate rather than implement? Reassess candidates when SUP-023 is designed. |

Other low-commitment ideas were `remove`, an `install` alias, explicit migration commands, named user profiles, richer dependency metadata (`provides`, conflicts, optional dependencies), and optional `--view`/comma-separated-preset conveniences. Preserve their existence as brainstorming only; none is necessary to recover the core design. The safety concern about removing user code is more important than retaining the exact verbs. [C11], [C23], [C27], [C31].

# H. Already covered: do not duplicate during integration

| Topic | Current home | Why it is not a new supplement feature |
| --- | --- | --- |
| The three-add-on v0 and license -> gitattributes -> pages progression | [Overview][S00], [license][S41] | The scope and rationale are already explicit. |
| Generic capability detection, framework-aware behavior, package-manager selection | [CLI][S30], [architecture][S20] | Only the specific passthrough/runtime/test details in SUP-003 add information. |
| Presets versus add-ons, native leaf files, ordered composition, cycle checks, scopes, overrides | [Core model][S10], [Git attributes][S42], [resolution][S50] | Repeating the taxonomy would inflate the supplement. |
| Pure passthrough versus intentional composition, Leftium name precedence, raw `sv:` escape hatch | [CLI][S30], [architecture][S20] | Already incorporated in the cleanup. |
| Thin reusable Pages workflow, static compatibility, domain/base-path handling | [Pages][S43], [migration plan][M10] | Operational details present in the separate migration plan count as covered. |
| DNS/host retirement, canonical links, deep links, deployment verification, workflow YAML | [Migration plan][M10], [workflow template][M20] | Do not copy these into a competing product contract. |
| Preset.dev predecessors and their destinations, including the starter kit's components | [Influences][S90] | The earlier missing repository inventory has already been recovered. |
| Independent runtime libraries and one small initial Leftium package | [Architecture][S20], [influences][S90] | No new monorepo/package split is warranted by the historical layouts. |
| Mine versus scope, explicit/local resolution, collision errors, provenance, future reproducibility | [Resolution][S50] | SUP-015 to SUP-017 add operational/trust detail, not a new source model. |
| `check`/`outdated`/`update`/`doctor` distinctions, deferred configuration and locking | [Roadmap][S60] | Add only the missing behaviors identified above. |
| Local shared logo renderer, native visual schema, reusable default, independent library extraction | [Roadmap][S60] | SUP-024 to SUP-028 concern persistence, variants, output installation, and preservation. |
| Dry-run safety and structured agent plans | [Roadmap][S60] | Already says dry runs must not mutate local or remote state. |

# I. Integration checklist

- [ ] Review SUP-001 and SUP-002 against the intended v0 behaviors; add only the clarifications needed to satisfy existing promises.
- [ ] Decide the passthrough `sv` runtime policy in SUP-003 without changing the interoperability direction.
- [ ] Preserve the Pages documentation and fleet-auditing goals separately from implementation of a scanner.
- [ ] Restore the explicitly deferred license-review item to the roadmap; do not attach it to routine license creation.
- [ ] Keep assistant-only proposals visibly tentative, especially holds, direct remote acquisition, and agent configuration.
- [ ] Put logo installation detail into a future focused sub-spec without restoring a separate project-source abstraction or changing the upstream visual schema.
- [ ] Re-verify upstream APIs, actual predecessor behavior, sample assets, and security/legal tool assumptions when implementation begins.
- [ ] Mark each merged supplement item with its destination, or remove it once its detail has a single authoritative home.

# Appendix A. Comparison manifest

All links below are pinned to the baseline commit. They are comparison sources, not claims about later repository changes.

- [Overview and v0 contract][S00] - `specs/10-leftium/00-spec.md`.
- [Core model][S10] - `specs/10-leftium/10-core-model.md`.
- [Implementation architecture][S20] - `specs/10-leftium/20-architecture.md`.
- [CLI][S30] - `specs/10-leftium/30-cli.md`.
- [License add-on][S41] - `specs/10-leftium/40-addons/10-license.md`.
- [Git attributes add-on][S42] - `specs/10-leftium/40-addons/20-gitattributes.md`.
- [Pages add-on][S43] - `specs/10-leftium/40-addons/30-pages.md`.
- [Resolution and mines][S50] - `specs/10-leftium/50-resolution-and-mines.md`.
- [Roadmap][S60] - `specs/10-leftium/60-roadmap.md`.
- [Influences and predecessors][S90] - `specs/10-leftium/90-influences.md`.
- [Operational Pages migration plan][M10] - `specs/20-github-pages-migration/10-plan.md`.
- [Operational workflow template][M20] - `specs/20-github-pages-migration/20-workflow-template.yml`.

# Appendix B. Conversation coverage ledger

The indices below preserve the extraction's order. They are not reconstructed chronological turns. In particular, the repository inventory originally being sought is **C11**, the assistant record whose text begins "Yes. After looking at the rest of your repos...". Its text is on physical JSON line 48 at this revision.

| Source | Role | Search anchor | Treatment |
| --- | --- | --- | --- |
| [C00] | user | are there examples of pages.yml GH deployment scripts? | SUP-006, SUP-007, SUP-008 |
| [C01] | assistant | your idea is essentially a small GitHub Pages deployment standard/library | SUP-006, SUP-007, SUP-008; naming alternatives retained only as history |
| [C02] | user | a "default" logo set that I like to use before i create a custom one | SUP-024, SUP-027; the uploaded sample is explicitly not the default |
| [C03] | assistant | Only a few targeted updates are needed; the broader model still holds. | SUP-024, SUP-025, SUP-027, SUP-028; separate project-source abstraction not restored |
| [C04] | user | do we need to specify anything else before saving the full spec file? | Baseline-finalization context |
| [C05] | assistant | I think we have enough to save the full spec now. | Covered scope/default/provenance principles; unresolved defaults are not reinstated |
| [C06] | user | give me md file of full spec | Export request; no additional product requirement |
| [C07] | assistant | Download leftium-spec.md | Download pointer, not the downloaded file contents |
| [C08] | user | i have a similar template project for robots.txt | SUP-006, SUP-007, SUP-020 |
| [C09] | assistant | pages-yml + the robots-txt pattern + a reusable workflow | SUP-006, SUP-007, SUP-008, SUP-020 |
| [C10] | user | what about a mono-repo combining both pages-yaml and robots-txt? | SUP-021; repository-research context |
| [C11] | assistant | you've already built an earlier version of this idea | SUP-001, SUP-021, SUP-022; historical research; predecessor inventory already covered |
| [C12] | user | as well as prettier/etc preferences (semicolons, spacing, etc) | SUP-018 |
| [C13] | assistant | name around the job the tool does | Covered naming/composition rationale; alternative names not promoted |
| [C14] | user | we can also do le since that is the abbr. | Covered CLI aliases |
| [C15] | assistant | first-class aliases from the same package | Covered aliases; historical binary-collision observation not treated as a new requirement |
| [C16] | user | most of my projects are kit projects | SUP-003, SUP-004; generic/Svelte/Kit support already covered |
| [C17] | assistant | reuse sv ideas aggressively, reuse sv-utils selectively | SUP-003, SUP-004, SUP-018; optional reverse interoperability is historical |
| [C18] | user | maintain compatibility with sv community addon specs | SUP-019; compatibility direction reconciled in history section |
| [C19] | assistant | Knip is an excellent le add-on | SUP-019, SUP-009; native-sv-contract and scoped-name proposals superseded |
| [C20] | user | i think the reverse is more interesting tho: le can add sv addons | SUP-003; principal interoperability decision already covered |
| [C21] | assistant | Multiple add-ons remain nice | SUP-003, SUP-013; passthrough/composition/collision policy already covered |
| [C22] | user | lets write an MD spec for le | Draft request |
| [C23] | assistant | le is not primarily a new add-on ecosystem | SUP-001, SUP-003 through SUP-005, SUP-008 through SUP-010, SUP-012, SUP-013, SUP-018 through SUP-021; first long draft |
| [C24] | user | maybe update like pnpm update | SUP-009, SUP-010, SUP-018 |
| [C25] | assistant | spawn for transparent passthrough; use APIs for composition | SUP-003, SUP-009, SUP-010, SUP-018 |
| [C26] | user | support installing multiple presets, based on purpose | SUP-001; native composable purpose-specific presets already covered |
| [C27] | assistant | Homebrew gives us the missing model for third-party presets | SUP-011, SUP-012, SUP-014 through SUP-016, SUP-018 |
| [C28] | user | how to make non JSON presets more ergonomic? | SUP-020; native-format model already covered |
| [C29] | assistant | Native preset format does not require dumb textual concatenation. | SUP-020; local file discovery and source terminology considered |
| [C30] | user | there could be .leftium folders at multiple levels | Covered scope/source distinction; SUP-014, SUP-017 context |
| [C31] | assistant | Package managers give us another really useful vocabulary | SUP-012, SUP-014, SUP-017; speculative profiles/dependency features retained as history |
| [C32] | user | adding license files. that is a simple addon that could be part of v0 | SUP-002; license-first v0 already covered |
| [C33] | assistant | report a mismatch if the file and package.json disagree | SUP-002, SUP-023; alternative license catalog remains optional |
| [C34] | user | ensure the license is compatible with all deps? | SUP-023 |
| [C35] | assistant | The easy part is inventory | SUP-023; scanner claims and illustrative allow/deny lists are not verified policy |
| [C36] | user | license check can be added after v0 | SUP-023; explicit deferral |
| [C37] | assistant | keep license deliberately simple | Covered v0 boundary |
| [C38] | user | lets update the spec with new decisions | Draft request |
| [C39] | assistant | Here’s the revised spec with the newer decisions folded in | SUP-009, SUP-012, SUP-013, SUP-019, SUP-020, SUP-023; second long draft |
| [C40] | user | a playful name for leftium sources: mine | Covered mine terminology |
| [C41] | assistant | mine is actually quite good. | Covered naming rationale; extra metaphors not promoted |
| [C42] | user | how about quarry? it's longer, but not ambiguous | Historical naming alternative |
| [C43] | assistant | quarry is stronger on clarity, but weaker on metaphor. | Historical naming rationale, already represented in influences/resolution |
| [C44] | user | ok lets stick with mine. update spec? | Covered explicit naming decision |
| [C45] | assistant | promote mine to the official user-facing term | SUP-009, SUP-010, SUP-012, SUP-013, SUP-017, SUP-020, SUP-023; third long draft |
| [C46] | user | could an addon help with installing a logo pack | SUP-024 through SUP-028 |
| [C47] | assistant | logo is a strong le add-on | SUP-024, SUP-025, SUP-027, SUP-028; initial artifact-pack approach refined |
| [C48] | user | a logo pack can be completely specified via JSON | SUP-024 through SUP-026; concrete rocket configuration |
| [C49] | assistant | favicon = resize full logo | SUP-024 through SUP-028; installation preset proposal revised by C50 |
| [C50] | assistant | your “default logo before I customize it” changes one thing I said earlier | SUP-024, SUP-027, SUP-028; sample pack inventory; default JSON still missing |
| [C51] | user | "House Keys" is supposed to be the name of the app. | SUP-028; context for name correction |
| [C52] | assistant | House Keys is application metadata, not logo-rendering configuration. | SUP-028; icon-derived app identity and schema-expansion suggestions not promoted |
| [C53] | user | the app name was added just because we needed a filename | SUP-028; explicit clarification |
| [C54] | assistant | I would not put the app name into the visual JSON just for le. | SUP-028; preserve existing application identity |
| [C55] | user | any updates to spec needed? | Connects to C03 by content; not proof of complete transcript chronology |

<!-- Immutable source references. C indices are zero-based JSON array entries. -->

[S00]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/00-spec.md
[S10]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/10-core-model.md
[S20]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/20-architecture.md
[S30]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/30-cli.md
[S41]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/40-addons/10-license.md
[S42]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/40-addons/20-gitattributes.md
[S43]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/40-addons/30-pages.md
[S50]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/50-resolution-and-mines.md
[S60]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/60-roadmap.md
[S90]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/10-leftium/90-influences.md
[M10]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/20-github-pages-migration/10-plan.md
[M20]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/20-github-pages-migration/20-workflow-template.yml
[C00]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L2-L5
[C01]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L6-L9
[C02]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L10-L13
[C03]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L14-L17
[C04]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L18-L21
[C05]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L22-L25
[C06]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L26-L29
[C07]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L30-L33
[C08]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L34-L37
[C09]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L38-L41
[C10]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L42-L45
[C11]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L46-L49
[C12]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L50-L53
[C13]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L54-L57
[C14]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L58-L61
[C15]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L62-L65
[C16]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L66-L69
[C17]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L70-L73
[C18]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L74-L77
[C19]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L78-L81
[C20]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L82-L85
[C21]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L86-L89
[C22]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L90-L93
[C23]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L94-L97
[C24]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L98-L101
[C25]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L102-L105
[C26]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L106-L109
[C27]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L110-L113
[C28]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L114-L117
[C29]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L118-L121
[C30]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L122-L125
[C31]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L126-L129
[C32]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L130-L133
[C33]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L134-L137
[C34]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L138-L141
[C35]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L142-L145
[C36]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L146-L149
[C37]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L150-L153
[C38]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L154-L157
[C39]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L158-L161
[C40]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L162-L165
[C41]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L166-L169
[C42]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L170-L173
[C43]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L174-L177
[C44]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L178-L181
[C45]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L182-L185
[C46]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L186-L189
[C47]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L190-L193
[C48]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L194-L197
[C49]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L198-L201
[C50]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L202-L205
[C51]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L206-L209
[C52]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L210-L213
[C53]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L214-L217
[C54]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L218-L221
[C55]: https://github.com/Leftium/le/blob/4675a304b0323dcf8ed349a3dd173a0fa6e71b87/specs/90-sources/leftium-conversation.json#L222-L225
