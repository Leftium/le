# Agent handoff orchestration

**Status:** Draft design for later integration into the Leftium specification and implementation.
**Scope:** Provider-neutral handoff mechanics, local handoff state, WIP recovery, companion agent instructions, and arbitrary multi-participant workflows.

## Motivation

Agent-assisted development often crosses execution environments. One participant may plan through a hosted GitHub integration, another may implement in a local checkout with stronger filesystem and test access, and another may independently review or verify the result. The same participant may also hand work to a fresh session of itself after context, token, usage, or process limits interrupt work.

Today each participant repeatedly rediscovers Git, branch, pull-request, worktree, and workflow state and then performs a series of mechanical handoff operations one tool call at a time.

Leftium should make these transitions deterministic, idempotent, inspectable, and recoverable without deciding the engineering work for any participant.

The first motivating workflow uses ChatGPT and T3, but the core model must not assume exactly two agents, exactly two workflow roles, or even two distinct participants. It must support one-participant session rollover, ordinary two-participant handoff, three-or-more-participant chains, parallel assist work, and other providers or harnesses such as Codex, OpenCode, ChatGPT Work, or future tools.

## Design principles

1. **Model transitions between participants, not a fixed pair of roles or brands.** A handoff is a directed transition from one participant to another. Source and destination may be the same participant.
2. **Keep workflow meaning project-defined.** Labels such as planning, implementation, review, verification, or deployment may be useful phase metadata or project policy, but they are not a closed set built into the handoff engine.
3. **Describe participants by profile and capabilities.** Harness/provider names such as `t3`, `chatgpt`, `codex`, and `opencode` are profiles that help derive mechanics; they do not define the workflow topology.
4. **Keep intent in agent policy and mechanics in the CLI.** Agent instructions decide when a handoff is appropriate, who owns decisions, and what requires approval. Leftium performs deterministic Git/GitHub checks and permitted mutations.
5. **Do not hide partial effects.** Every operation reports what succeeded, what was already satisfied, what failed, what was skipped, and the exact manual follow-up when known.
6. **Rerunning is the normal recovery path.** Operations are idempotent where possible and tolerate an earlier run stopping after some effects succeeded.
7. **Do not make incorporation decisions.** When one or more participants create side-branch work, the receiving participant or project policy decides whether to cherry-pick, squash, reproduce, partially use, or discard it.
8. **WIP is observed recovery state.** Leftium normally does not create WIP commits. A user may create one manually when an agent is interrupted by token, usage, process, or session limits.
9. **Local coordination state stays local.** Handoff metadata lives under an ignored repository-local directory and must not become project history.

## Participants, transitions, profiles, and phases

A **participant** is one execution context taking part in the workflow. It may be:

- a local coding harness
- a hosted assistant with GitHub access
- a review agent
- a human operating the CLI
- a fresh session of the same harness that previously held the work

A **profile** describes useful mechanics or capabilities of a participant, such as local-worktree access, GitHub PR access, or a preferred convenience alias. Initial built-in profiles may include `t3`, `chatgpt`, `codex`, and `opencode`, but profiles are not workflow roles.

A **handoff** is a directed transition:

```text
participant A -> participant B
```

The source and destination may be identical:

```text
codex session 1 -> codex session 2
```

This is still useful as a deterministic checkpoint, state validation, and context/session rollover.

A workflow may contain any number of transitions:

```text
chatgpt -> t3 -> codex -> chatgpt
```

or branching collaboration:

```text
                 -> agent B assist branch
checkpoint/WIP -
                 -> agent C assist branch
                        |
                        v
                    agent D
```

No participant count, ordering, or topology is implied by the core model.

A handoff may carry an optional **phase** or **purpose** label such as `plan`, `implement`, `review`, or `verify`. Projects may use these labels to express ownership rules, but Leftium should not make a fixed role enumeration part of its fundamental API.

A provisional generic command surface is:

```sh
npx leftium handoff --to t3
npx leftium handoff --from t3 --to chatgpt
npx leftium handoff --from chatgpt --to codex --phase implement
npx leftium handoff --from codex --to codex --phase continue
```

When the source can be derived safely from local handoff state or an explicit participant profile, `--from` may be optional.

Destination convenience shims may map directly to the same orchestration:

```sh
t3-handoff
chatgpt-handoff
```

A shim means "handoff to this participant/profile"; it does not define a separate implementation.

The exact command grammar is not frozen by this draft. The internal API should represent arbitrary source and destination participants plus optional workflow metadata rather than separate `handoffToT3` or `handoffToChatGPT` paths.

## Capability-driven mechanics

Different transitions require different mechanics. The CLI should derive a handoff plan from the current repository state, project policy, and the relevant participant capabilities instead of mapping every participant name to one hard-coded workflow.

Examples:

- A hosted participant handing to a local-worktree participant may require fetch, checkout/fast-forward, worktree/index inspection, WIP detection, and assist-branch discovery.
- A local participant handing to a hosted GitHub participant may require push, PR-body update, draft/ready transition, and remote verification.
- A local participant handing to another local harness on the same checkout may require only state validation and a local handoff record.
- A participant handing to a fresh session of itself may require no Git mutation at all; the value is a validated checkpoint and concise continuation state.
- A third participant joining as an assistant may create an assist branch from the current checkpoint without becoming the canonical owner of the work branch.

Profiles may provide defaults for capabilities and convenience wording. Project or invocation data may override only where safe and explicit. Do not introduce a heavyweight provider plugin protocol before concrete integrations require it.

## Local handoff state

Use a repository-local `.handoff/` directory for transient coordination metadata. It must be ignored by Git.

Possible contents are illustrative, not a frozen schema:

```text
.handoff/
  state.json
  handoff.json
  pr-body.md
```

The state may record:

- repository identity
- pull-request number when applicable
- base and head branch
- expected remote head SHA
- detected WIP SHA and parent
- source and destination participant/profile identifiers
- optional phase/purpose
- discovered assist branches and their tips
- completed handoff steps needed for idempotent recovery
- prior transitions useful for safe continuation

Do not store secrets or credentials. Do not require this directory for read-only inspection when the necessary state can be reconstructed safely.

If `.handoff/` or its contents are tracked, a mutating handoff must stop and report the violation. The exact mechanism used to ensure the directory is ignored is an implementation decision; see the companion policy section.

Handoff state should describe the current transition and evidence needed for safe recovery, not become an authoritative workflow database. Git, GitHub, and native project files remain source evidence where available.

## WIP recovery

A WIP commit is a user-created recovery checkpoint. The initial recognition rule is deliberately narrow:

- only the current relevant canonical branch tip receives special treatment
- its commit subject must be exactly `WIP`
- historical commits containing "WIP" elsewhere do not acquire special semantics

Leftium does not normally create this commit.

When a participant receives work whose canonical branch tip is exact `WIP`, the CLI records its SHA and parent. This establishes a checkpoint from which assist work can be related and against which later intentional history replacement can be guarded.

If no exact WIP tip exists, the handoff follows the ordinary path for the source/destination capabilities.

### Assist branches

Any participant that should not modify the canonical branch may create commits on a side branch rooted at the exact WIP checkpoint.

A scalable candidate naming convention is:

```text
assist/<participant-or-profile>/wip-<short-wip-sha>
```

For example:

```text
assist/chatgpt/wip-2f290fc
assist/codex/wip-2f290fc
```

The simpler earlier form `assist/wip-<short-wip-sha>` may be accepted for compatibility. Exact branch grammar remains provisional. The relationship to an exact WIP SHA must be mechanically verifiable.

There may be zero, one, or several matching assist branches. The assist commits themselves do not require special commit subjects or tags.

When preparing a handoff that exposes assist work, Leftium should:

1. identify matching assist branches when available
2. verify each reported branch descends from the expected WIP commit
3. report each branch name, WIP SHA, tip SHA, and useful commit/diff range
4. leave the canonical work branch unchanged
5. leave incorporation entirely to the receiving participant or explicit project policy

Example:

```text
[ok] canonical branch tip is WIP 2f290fc
[ok] assist/chatgpt/wip-2f290fc descends from WIP; tip 8a31d7b
[ok] assist/codex/wip-2f290fc descends from WIP; tip 91be044
[ok] local branch matches expected remote state

READY FOR T3

Assist work:
  assist/chatgpt/wip-2f290fc  2f290fc..8a31d7b
  assist/codex/wip-2f290fc    2f290fc..91be044

The receiving participant decides whether and how to incorporate each branch.
```

The helper must not automatically merge, rebase, cherry-pick, squash, or delete an assist branch.

## Handoff planning and execution

A handoff should first derive a concrete plan from:

- current Git/worktree/index state
- relevant remote and PR state
- source participant/profile when known
- destination participant/profile
- optional phase/purpose and project policy
- WIP/checkpoint state
- available assist branches
- companion agent policy

The resulting plan may be read-only or mutating.

Common receive-side checks may include:

1. discover the Git repository and relevant pull request when applicable
2. fetch the remote when the destination relies on remote state
3. validate the PR/workflow state required by project policy
4. inspect local worktree and index without discarding or unstaging user changes
5. checkout and fast-forward the target branch only when safe and needed
6. verify local HEAD, remote branch head, and PR head where relevant
7. locate project-defined milestone/work contracts
8. detect an exact WIP tip
9. discover and verify assist branches tied to that WIP
10. check companion handoff policy
11. report READY, PARTIAL, or BLOCKED with actionable details

Common publish-side actions may include:

1. validate repository, branch, expected remote state, and PR identity
2. verify unfinished `WIP` is not being presented as final history when project policy requires final history
3. push normally when the local branch is a fast-forward of the remote branch
4. support a narrowly guarded history replacement when the remote tip is a previously recorded exact WIP checkpoint and the finished local history intentionally replaces that checkpoint
5. update PR metadata/body from prepared local handoff content when needed by the destination
6. change draft/ready state only when required by project policy
7. verify the final local/remote/PR relationship
8. report all successful, already-satisfied, failed, and skipped steps

These are capability-derived building blocks, not two mandatory handoff roles. A specific transition may use only a subset.

The command should not automatically run expensive builds or tests unless the project policy or explicit invocation requests them. Those are normally task-specific work rather than generic handoff mechanics.

A successful result is intended to be trusted by the receiving participant. Agent policy should tell agents not to repeat equivalent setup checks merely to verify the helper's verification.

## WIP replacement safety

Any non-fast-forward replacement of a known WIP checkpoint must use an exact expected remote SHA lease. A generic force push is outside the contract.

The helper must verify that the remote checkpoint still matches the recorded expected WIP before rewriting it. The finished history may contain one or more commits replacing that WIP checkpoint. An unexpected remote move, unrelated rewrite, or ambiguous checkpoint blocks automatic replacement.

WIP rewrite permission is a narrowly scoped recovery mechanism, not a general exception to immutable pushed history.

## Result and recovery model

Human-readable output should use explicit step states such as:

- `[ok]` completed successfully
- `[already]` desired state was already present
- `[warn]` non-blocking issue
- `[fail]` attempted step failed
- `[skip]` step was not attempted because a prerequisite failed

Overall states:

- **READY**: the destination participant may proceed
- **PARTIAL**: some external effects succeeded, but manual work or a rerun is required before proceeding
- **BLOCKED**: prerequisites are not satisfied and no unsafe mutation was attempted

Expected failures must include practical remediation. If a push succeeds but a later PR edit fails, a rerun must recognize the successful push rather than treating it as a new conflict.

Success output should explicitly identify the destination participant/profile and enough verified state for that participant or a human to know why continuing is safe.

A future machine-readable mode should expose the same semantic result rather than requiring agents to parse prose.

## Companion agent policy

Handoff mechanics alone are insufficient because participants must know when to invoke them, which result they may trust, who owns incorporation decisions, and what an approved compound operation authorizes.

This policy should be installed through a general `agents-md` add-on with a `handoff` preset:

```sh
npx leftium add agents-md --preset handoff
```

Do not create a handoff-specific `agents-md-handoff` add-on.

The initial preset should own a clearly marked block in the repository-root `AGENTS.md` while preserving user-owned content outside that block. It should be idempotently regenerable and direct custom project-specific workflow rules outside the managed block.

The generic handoff preset should describe participant/transition invariants rather than hard-code ChatGPT/T3 or a two-role workflow. Project-owned prose may specify local workflow conventions such as:

- which participant or phase owns a draft PR
- which participant reviews a ready PR
- whether more than one reviewer/verifier participates
- when a participant may create assist work
- who decides incorporation
- whether a same-participant handoff is used for fresh-session continuation

Actor-specific global instructions may provide convenience aliases or harness policy without changing the generic project contract.

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
- **non-adopting project operations** execute project-aware workflows without adopting a capability, so handoff belongs in that family even if the final command spelling is `le handoff`

Handoff orchestration should be callable independently of Commander, following the same pattern as existing Leftium orchestration. Git/GitHub/process/filesystem effects belong in the TypeScript shell. Pure classification such as handoff state, WIP state, capability matching, step/result transitions, and profile-independent safety decisions are candidates for the functional core only if implementation shows a useful boundary.

Do not require a heavyweight plugin protocol merely to support participant profiles. Start with data-driven built-in profiles and a participant-neutral transition core.

## Safety boundaries

The initial implementation must not:

- assume exactly two participants
- require source and destination to differ
- require a fixed implementation/review role pair
- create WIP commits as part of ordinary handoff
- silently stage, unstage, discard, or overwrite unrelated worktree changes
- automatically incorporate assist-branch commits
- automatically delete assist branches
- use an unconstrained force push
- change PR state when earlier required publication steps failed
- claim READY when the final state required by the destination is unverified
- require a particular AI provider or harness for the core workflow

## Acceptance scenarios

The design should eventually be validated against at least:

1. same-participant handoff to a fresh session with no remote mutation
2. ordinary hosted-to-local handoff
3. ordinary local-to-hosted handoff
4. a three-participant chain where each transition uses the same generic handoff core
5. more than one valid assist branch from the same WIP checkpoint
6. repeated handoff with no changes
7. manually created exact WIP tip with no assist work
8. WIP tip with valid assist work
9. assist branch that does not descend from the expected WIP, producing a safe block/warning
10. dirty/staged local work preserved and reported without destructive cleanup
11. completed implementation pushed normally and PR state updated when project policy requests it
12. final history safely replacing a known remote WIP using an exact lease
13. remote branch changed unexpectedly before WIP replacement
14. push succeeds but later metadata update fails, followed by successful idempotent rerun
15. missing companion agent policy with remediation command
16. stale/malformed managed `AGENTS.md` handoff block
17. tracked `.handoff/` state rejected before mutating handoff
18. the same transition mechanics invoked with profiles other than T3/ChatGPT
19. a workflow with no semantic "review" phase
20. a workflow with multiple review or verification participants

## Open decisions

- Final CLI grammar for source, destination, optional phase/purpose, and convenience shims.
- How participant identity differs from reusable profile identity when several sessions use the same harness.
- Which participant capabilities should be explicit data versus inferred defaults.
- Exact assist-branch naming when the same profile may create more than one assist branch from one checkpoint.
- Minimal `.handoff/` state schema and which state is reconstructible.
- Whether handoff itself, `agents-md`, a future ignore add-on, or composition owns the `.handoff/` ignore rule.
- How GitHub PR discovery behaves when several PRs or remotes are plausible.
- Exact exit-code mapping for READY, PARTIAL, and BLOCKED.
- Whether convenience shim binaries ship in the `leftium` package or later as tiny npm shim packages.

These should be settled by implementation fixtures and real multi-participant handoff integrations rather than by assumptions from the initial ChatGPT/T3 workflow.
