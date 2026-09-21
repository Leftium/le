# Agent handoff orchestration

**Status:** Draft design for later integration into the Leftium specification and implementation.
**Scope:** Provider-neutral handoff mechanics, local handoff state, WIP recovery, and companion agent instructions.

## Motivation

Agent-assisted development often crosses execution environments. One agent may plan or review through a hosted GitHub integration while another works in a local checkout with stronger filesystem, test, and build access. Today each agent repeatedly rediscovers Git, branch, pull-request, and worktree state and then performs a series of mechanical handoff operations one tool call at a time.

Leftium should make these transitions deterministic, idempotent, inspectable, and recoverable without deciding the engineering work for either agent.

The first motivating workflow uses ChatGPT for planning/review and T3 for local implementation, but those products are examples rather than architectural roles. The handoff model must support other providers and harnesses such as Codex, OpenCode, ChatGPT Work, or future tools.

## Design principles

1. **Model workflow roles, not brands.** Core behavior is defined by the destination role, such as implementation or review. Harness/provider names are profiles and convenience aliases.
2. **Keep intent in agent policy and mechanics in the CLI.** Agent instructions decide when a handoff is appropriate and what requires approval. Leftium performs deterministic Git/GitHub checks and mutations.
3. **Do not hide partial effects.** Every operation reports what succeeded, what was already satisfied, what failed, what was skipped, and the exact manual follow-up when known.
4. **Rerunning is the normal recovery path.** Operations are idempotent where possible and must tolerate an earlier run stopping after some effects succeeded.
5. **Do not make incorporation decisions.** When an assisting agent creates side-branch work, the receiving implementation agent decides whether to cherry-pick, squash, reproduce, partially use, or discard it.
6. **WIP is observed recovery state.** Leftium normally does not create WIP commits. A user may create one manually when an agent is interrupted by token, usage, process, or session limits.
7. **Local coordination state stays local.** Handoff metadata lives under an ignored repository-local directory and must not become project history.

## Roles and profiles

The initial workflow has two canonical roles:

- **implementation**: prepare a trustworthy local environment for an implementation agent to continue work.
- **review**: publish completed local work and prepare the pull request for an independent reviewer.

These roles are intentionally asymmetric.

An **actor profile** identifies a provider or harness such as `t3`, `chatgpt`, `codex`, or `opencode`. Profiles may control convenience wording, capability detection, or assist-branch naming, but must not redefine the core safety contract.

A provisional canonical command surface is:

```sh
npx leftium handoff implementation --to t3
npx leftium handoff review --to chatgpt
```

Convenience shims may map directly to the same orchestration:

```sh
t3-handoff
chatgpt-handoff
```

The exact command grammar is not frozen by this draft. In particular, `npx leftium handoff t3` may be a useful profile shortcut. The internal API should remain role-based so another harness can occupy either role without adding another implementation path.

## Local handoff state

Use a repository-local `.handoff/` directory for transient coordination metadata. It must be ignored by Git.

Possible contents are illustrative, not a frozen schema:

```text
.handoff/
  state.json
  review.json
  pr-body.md
```

The state may record:

- repository identity
- pull-request number
- base and head branch
- expected remote head SHA
- detected WIP SHA and parent
- source and destination actor profiles
- discovered assist branches and their tips
- completed handoff steps needed for idempotent recovery

Do not store secrets or credentials. Do not require this directory for read-only inspection when the necessary state can be reconstructed safely.

If `.handoff/` or its contents are tracked, a mutating handoff must stop and report the violation. The exact mechanism used to ensure the directory is ignored is an implementation decision; see the `agents-md` integration section.

## WIP recovery

A WIP commit is a user-created recovery checkpoint. The initial recognition rule is deliberately narrow:

- only the current relevant branch tip receives special treatment
- its commit subject must be exactly `WIP`
- historical commits containing "WIP" elsewhere do not acquire special semantics

Leftium does not normally create this commit.

When preparing an **implementation** handoff, the CLI detects an exact WIP tip and records its SHA and parent. This establishes the checkpoint from which side work can be related.

If no exact WIP tip exists, the handoff follows the ordinary implementation path.

### Assist branches

A hosted or otherwise separate assisting agent may create commits without modifying the canonical milestone/work branch. Such work belongs on a side branch rooted at the exact WIP checkpoint.

The scalable candidate naming convention is:

```text
assist/<actor>/wip-<short-wip-sha>
```

For example:

```text
assist/chatgpt/wip-2f290fc
```

The simpler earlier form `assist/wip-<short-wip-sha>` may be accepted for compatibility. Exact branch grammar remains provisional, but the relationship to an exact WIP SHA must be mechanically verifiable.

The assist commits themselves do not require special commit subjects or tags.

During an implementation handoff, Leftium should:

1. identify matching assist branches when available
2. verify each reported branch descends from the expected WIP commit
3. report the branch name, WIP SHA, tip SHA, and useful commit/diff range
4. leave the canonical work branch unchanged
5. leave incorporation entirely to the receiving implementation agent

Example success output:

```text
[ok] pull request is open and draft
[ok] canonical branch tip is WIP 2f290fc
[ok] assist/chatgpt/wip-2f290fc descends from WIP
[ok] assist tip is 8a31d7b
[ok] local branch matches expected remote state

READY FOR IMPLEMENTATION

Assist work:
  branch: assist/chatgpt/wip-2f290fc
  range:  2f290fc..8a31d7b

The implementation agent decides whether and how to incorporate this work.
```

The helper must not automatically merge, rebase, cherry-pick, squash, or delete an assist branch.

## Implementation handoff

The implementation direction prepares a trustworthy local starting point. The exact checks depend on available capabilities, but the initial GitHub workflow should include:

1. discover the Git repository and relevant pull request
2. fetch the remote
3. validate that the PR is in the workflow state expected for implementation, typically open and draft
4. identify the PR base and head branches
5. inspect local worktree and index without discarding or unstaging user changes
6. checkout and fast-forward the implementation branch only when safe
7. verify local HEAD, remote branch head, and PR head
8. locate the milestone/work contract when the project defines one
9. detect an exact WIP tip
10. discover and verify assist branches tied to that WIP
11. check the companion handoff policy
12. report READY, PARTIAL, or BLOCKED with actionable details

The command should not automatically run expensive builds or tests. Those are project- and milestone-specific implementation work.

A successful result is intended to be trusted by the receiving agent. Agent policy should tell the agent not to repeat equivalent Git/GitHub setup checks merely to verify the helper's verification.

## Review handoff

The review direction publishes completed implementation work and prepares the remote pull request for independent review.

A typical operation may:

1. validate repository, branch, expected remote state, and PR identity
2. verify that unfinished `WIP` commits are not being published as final history
3. push normally when the local branch is a fast-forward of the remote branch
4. support a narrowly guarded history replacement when the remote tip is a previously recorded exact WIP checkpoint and the local finished history intentionally replaces that checkpoint
5. update the PR body from prepared local handoff content
6. mark the PR ready for review when requested
7. verify local HEAD, remote head, PR head, PR state, and relevant mergeability metadata
8. report all successful, already-satisfied, failed, and skipped steps

Any non-fast-forward WIP replacement must use an exact expected remote SHA lease. A generic force push is outside the contract. The final history may contain one or more implementation commits replacing the WIP checkpoint, but the helper must reject an unexpected remote move or an unrelated rewrite.

The precise approval model belongs in agent instructions. A companion policy may declare one approved review-handoff invocation to cover its expected push, PR update, ready transition, and verification rather than requiring separate approval for every internal operation.

## Result and recovery model

Human-readable output should use explicit step states such as:

- `[ok]` completed successfully
- `[already]` desired state was already present
- `[warn]` non-blocking issue
- `[fail]` attempted step failed
- `[skip]` step was not attempted because a prerequisite failed

Overall states:

- **READY**: the destination agent may proceed
- **PARTIAL**: some external effects succeeded, but manual work or a rerun is required before proceeding
- **BLOCKED**: prerequisites are not satisfied and no unsafe mutation was attempted

Expected failures must include practical remediation. If a push succeeds but a later PR edit fails, a rerun must recognize the successful push rather than treating it as a new conflict.

A future machine-readable mode should expose the same semantic result rather than requiring agents to parse prose.

## Companion agent policy

Handoff mechanics alone are insufficient because an agent must know when to invoke them, which result it may trust, who owns incorporation decisions, and what an approved compound operation authorizes.

This policy should be installed through a general `agents-md` add-on with a `handoff` preset:

```sh
npx leftium add agents-md --preset handoff
```

Do not create a handoff-specific `agents-md-handoff` add-on.

The initial preset should own a clearly marked block in the repository-root `AGENTS.md` while preserving user-owned content outside that block. It should be idempotently regenerable and should direct custom project-specific workflow rules outside the managed block.

The generic handoff preset should describe roles and invariants rather than hard-code ChatGPT/T3. Actor-specific global instructions may provide convenience aliases or additional harness policy.

A handoff command should scan the applicable `AGENTS.md` files for the Leftium-managed handoff policy marker/version. Missing or stale companion policy is normally a warning with remediation:

```text
[warn] Leftium handoff agent policy is not installed or is stale.
       Run: npx leftium add agents-md --preset handoff
```

Manual CLI use remains valid without the companion text. Malformed or ambiguous managed markers should be reported as a conflict by the add-on rather than silently replaced.

The first implementation may target `AGENTS.md` only. Other provider-specific instruction files should be added only when a concrete harness requires them; do not duplicate the same policy across several files speculatively.

## Relationship to Leftium architecture

This work exercises two existing Leftium concepts:

- **add-ons** adopt persistent project configuration, so `agents-md --preset handoff` belongs under `le add`
- **non-adopting project operations** execute project-aware workflows without adopting a capability, so handoff belongs in that family even though the final command spelling may be `le handoff` rather than a generic `le run`

The handoff orchestration should be callable independently of Commander, following the same pattern as existing Leftium orchestration. Git/GitHub/process/filesystem effects belong in the TypeScript shell. Pure classification such as handoff state, WIP state, step/result transitions, and profile-independent safety decisions are candidates for the functional core only if implementation shows a useful boundary.

Do not require a heavyweight plugin protocol merely to support actor profiles. Start with data-driven built-in profiles and a generic role-based core.

## Safety boundaries

The initial implementation must not:

- create WIP commits as part of ordinary handoff
- silently stage, unstage, discard, or overwrite unrelated worktree changes
- automatically incorporate assist-branch commits
- automatically delete assist branches
- use an unconstrained force push
- mark a PR ready when earlier required publication steps failed
- claim READY when the final local/remote/PR relationship is unverified
- require a particular AI provider or harness for the core workflow

## Acceptance scenarios

The design should eventually be validated against at least:

1. clean draft PR handed to a local implementation harness
2. repeated implementation handoff with no changes
3. manually created exact WIP tip with no assist work
4. WIP tip with valid assist work from a hosted agent
5. assist branch that does not descend from the expected WIP, producing a safe block/warning
6. dirty/staged local work preserved and reported without destructive cleanup
7. completed implementation pushed normally and PR marked ready
8. final history safely replacing a known remote WIP using an exact lease
9. remote branch changed unexpectedly before WIP replacement
10. push succeeds but PR update fails, followed by successful idempotent rerun
11. missing companion agent policy with remediation command
12. stale/malformed managed `AGENTS.md` handoff block
13. tracked `.handoff/` state rejected before mutating handoff
14. the same role workflow invoked with a non-T3/non-ChatGPT actor profile

## Open decisions

- Final CLI grammar: role-first commands, profile shortcuts, or both.
- Exact assist-branch naming and compatibility aliases.
- Minimal `.handoff/` state schema and which state is reconstructible.
- Whether handoff itself, `agents-md`, a future ignore add-on, or composition owns the `.handoff/` ignore rule.
- How GitHub PR discovery behaves when several PRs or remotes are plausible.
- Exact exit-code mapping for READY, PARTIAL, and BLOCKED.
- Whether convenience shim binaries ship in the `leftium` package or later as tiny npm shim packages.
- Which actor-profile capabilities are useful enough to encode rather than simply report.

These should be settled by implementation fixtures and the first real Vee handoff integrations rather than by provider-specific assumptions.
