# Agent-assisted workflow synchronization

**Status:** Draft design for later integration into the Leftium specification and implementation.
**Scope:** Agent-safe Git commits, local/shared project synchronization, workflow-state inference, WIP recovery, and companion agent instructions.

## Motivation

Agent-assisted development often alternates between two views of the same project:

- **local state**: a worktree, index, local branches, local tools, builds, tests, and unpushed work
- **shared state**: remote Git branches and commits plus GitHub pull-request metadata, reviews, and tracked workflow artifacts

Different agents or humans may consume either view at different times. The identity of the next agent is usually less important than making the project state safe, current, and understandable from whichever side is being used.

The first motivating workflow used ChatGPT for planning/review and T3 for local implementation. That exposed useful mechanics, but those product names are not the architectural boundary. A project may use one agent, two agents, several agents, fresh sessions of the same harness, or humans mixed with agents.

Leftium should make the local/shared boundary deterministic, inspectable, idempotent, and recoverable. Any capable agent should be able to examine the shared project state and infer the current workflow state and next required action without relying on a private handoff message from the previous agent.

## Core model

The fundamental synchronization boundary is:

```text
local project state <-> shared GitHub/project state
```

Shared state may include:

- remote branch and commit graph
- pull-request head/base and draft/ready state
- pull-request description and review state
- tracked project workflow files such as `AGENTS.md`, `MILESTONE.md`, or project-specific specs
- assist branches or other explicitly shared Git artifacts

A particular agent is a consumer or producer of this state, not a permanent owner of one side.

### Workflow roles belong to work, not agents

Roles such as planning, implementation, fixes, review, verification, deployment, or merge describe **workflow stages or tasks**. They are not permanently assigned to ChatGPT, T3, Codex, or another harness.

Any suitable agent may perform any role unless project policy imposes a constraint. The user chooses which agent receives the next task.

For example:

```text
no milestone PR
  -> next work: planning

draft milestone PR
  -> next work: implementation/fixes

ready milestone PR
  -> next work: independent review

review requests changes
  -> next work: fixes

clean review
  -> next action: human merge
```

A project may define different stages or omit these entirely. Leftium should not hard-code a closed role enumeration.

Some stages may carry relational constraints rather than agent assignments. For example, `independent review` may require a participant or session independent from the implementation that produced the change. Such constraints should produce warnings when violated, while explicit user direction may override project policy when appropriate.

### Repository state should be sufficient to resume

At the start of work, an agent should be able to inspect the repository and shared state and determine:

- what workflow state the project is currently in
- what work is complete or incomplete
- what action or stage comes next
- whether the current environment has the required capabilities
- whether a workflow constraint such as independent review applies

A previous agent may provide a useful summary, but that summary is not authoritative. Git, GitHub, and tracked project policy are the primary evidence.

The user remains responsible for choosing which agent or human performs the next action.

## Candidate command family

The command namespace is intentionally unresolved. `agent` is a current candidate because the operations exist to make agent-assisted development safer, but this spec does not require it.

Illustrative commands use the provisional namespace:

```sh
le agent status
le agent commit -m "fix(foo): repair thing" -- src/foo.ts src/foo.test.ts
le agent sync --from shared
le agent sync --to shared
```

The local project agent should evaluate whether `agent`, a different namespace, or selected root commands best fit Leftium's existing CLI before implementation.

The important API concepts are `status`, safe commit construction, and bidirectional local/shared synchronization; the exact spelling is secondary.

## Status and next-action inference

A read-only status operation should compare the relevant local and shared evidence and report the current workflow state.

Conceptually:

```text
local Git/worktree/index
        +
remote Git/PR state
        +
tracked project workflow policy
        |
        v
current state
next required action
constraints/capabilities
```

Example:

```text
Local:
  milestone/05-runtime @ def456
  clean

Shared:
  PR #5 ready
  head def456

Workflow:
  implementation published

Next:
  independent review

Constraint:
  reviewer should be independent of the implementation session
```

Another agent should be able to derive the same conclusion from the same state.

The first implementation does not need a universal workflow engine. Project-specific files such as `AGENTS.md` and `MILESTONE.md` may define the relevant state rules, while Leftium provides reliable Git/GitHub observations and a place for machine-readable support only when a concrete consumer requires it.

## Safe commit construction

The existing `approved-git-commit` helper demonstrates a reusable agent-safe Git primitive. Its important properties are broader than the original Vee workflow:

- explicit file/path approval boundary
- preservation of unrelated staged changes
- Conventional Commit subject validation
- explicit amend semantics
- amendment requires every file already changed by HEAD to be named
- merge commits require all staged/resolved-conflict files to be named
- resulting commit SHA is returned directly

This behavior should become a Leftium operation rather than remain a machine-specific dotfiles dependency.

Illustrative shape:

```sh
le agent commit \
  -m "fix(foo): repair thing" \
  -m "Preserve existing behavior while repairing the edge case." \
  -- src/foo.ts src/foo.test.ts
```

The CLI owns deterministic commit mechanics. It does **not** determine whether the user approved the commit. Approval is an agent-policy concern expressed through `AGENTS.md` or harness-level instructions.

The existing `approved-git-commit` command may remain as a compatibility shim over the Leftium implementation.

### Commit is not implicitly required by synchronization

A synchronization or session change does not automatically imply a commit.

Examples:

- a fresh session using the same local worktree may continue dirty local work without a commit
- local work that must become visible to a hosted GitHub-only agent may need committed and pushed state
- remote/shared work being synchronized locally needs no new commit
- a manually created WIP checkpoint may be the appropriate recovery artifact after an interrupted agent

The sync/status operation should report when transferable committed state is required instead of silently creating commits.

## Synchronization from shared state

A shared-to-local operation prepares the local project from the Git/GitHub state.

Illustrative command:

```sh
le agent sync --from shared
```

Possible checks/actions:

1. discover the Git repository and relevant pull request when applicable
2. fetch the remote
3. identify the canonical branch and PR relationship
4. inspect local worktree and index without discarding, unstaging, or overwriting user work
5. checkout or fast-forward only when safe and necessary
6. verify local HEAD, remote branch head, and PR head where applicable
7. locate tracked workflow contracts such as `AGENTS.md` and `MILESTONE.md`
8. detect an exact WIP tip
9. discover and verify assist branches tied to that WIP
10. report current workflow state and inferred next action

A successful result should be trustworthy enough that the receiving agent does not repeat equivalent Git/GitHub synchronization checks merely to verify Leftium's verification.

## Synchronization to shared state

A local-to-shared operation publishes enough local state for GitHub/shared consumers to see the current project state.

Illustrative command:

```sh
le agent sync --to shared
```

Possible checks/actions:

1. validate repository, branch, expected remote state, and PR identity
2. verify whether uncommitted local work prevents complete publication
3. push normally when local history is a safe fast-forward
4. support narrowly guarded replacement of a known WIP checkpoint
5. update PR description or workflow metadata when required by project policy
6. change draft/ready state only when the workflow calls for it
7. verify local HEAD, remote head, PR head, and relevant PR state
8. report the resulting workflow state and inferred next action

The operation does not choose the next agent. After synchronization, the user may open ChatGPT, T3, Codex, another harness, or continue manually. Any of them should be able to inspect the shared state and determine the next work.

## Destination-specific hints

A future destination hint such as:

```sh
le agent sync --to shared --for chatgpt
```

may be useful if a consumer has concrete capability requirements. For example, a GitHub-only hosted consumer requires all necessary work to be visible remotely.

Such a hint is optional transport/setup information. It must not mean "assign the next workflow role to ChatGPT."

Do not introduce provider-specific paths until a concrete capability difference requires them.

## WIP recovery

A WIP commit is a user-created recovery checkpoint, commonly created manually when an agent runs out of tokens, usage, process lifetime, or session context.

Recognition is deliberately narrow:

- only the current relevant canonical branch tip receives special treatment
- its commit subject must be exactly `WIP`
- historical commits containing "WIP" elsewhere do not acquire special semantics

Leftium normally does not create WIP commits.

When synchronizing from shared state, an exact WIP tip is reported as a recoverable checkpoint. When synchronizing finished work to shared state, a previously established WIP may be replaced only under the guarded rules below.

### Assist branches

A hosted or otherwise separate worker may create useful work without modifying the canonical WIP branch. Such work may live on a side branch rooted at the exact WIP checkpoint.

Candidate naming:

```text
assist/<source>/wip-<short-wip-sha>
```

Examples:

```text
assist/chatgpt/wip-2f290fc
assist/codex/wip-2f290fc
```

The source component is descriptive, not a role assignment. There may be zero, one, or several matching assist branches.

When synchronizing shared state locally, Leftium should:

1. identify matching assist branches
2. verify that each reported branch descends from the expected WIP
3. report branch name, WIP SHA, tip SHA, and useful range
4. leave the canonical work branch unchanged
5. leave incorporation entirely to the human or agent performing the current work

Example:

```text
[ok] canonical branch tip is WIP 2f290fc
[ok] assist/chatgpt/wip-2f290fc -> 8a31d7b
[ok] assist/codex/wip-2f290fc -> 91be044

Assist work:
  assist/chatgpt/wip-2f290fc  2f290fc..8a31d7b
  assist/codex/wip-2f290fc    2f290fc..91be044

No assist work was incorporated automatically.
```

The helper must not automatically merge, rebase, cherry-pick, squash, or delete assist branches.

## WIP replacement safety

Ordinary pushed history should be treated as immutable by the workflow.

A known WIP checkpoint is the narrow exception. Any non-fast-forward replacement must use an exact expected remote SHA lease. A generic force push is outside the contract.

Before replacing a WIP, Leftium must verify that:

- the expected remote tip is still the exact recorded/detected WIP
- the remote has not moved unexpectedly
- the proposed local history is an intentional replacement of that checkpoint rather than an unrelated rewrite

If those conditions cannot be established, synchronization stops without rewriting the remote.

## Project policy and AGENTS.md

Agents need shared instructions describing the project workflow: how to infer the current stage, when draft/ready transitions matter, what "independent review" means, approval requirements, and which helper operations to trust.

A general `agents-md` add-on should own a marked block in repository-root `AGENTS.md` while preserving project-owned prose outside the block.

Earlier discussion used:

```sh
le add agents-md --preset handoff
```

The workflow is now broader than participant-to-participant handoff, so the exact preset name is open. `handoff`, `agent-workflow`, or another name should be chosen when this design is integrated with the existing add-on/preset model.

The managed instructions should be provider-neutral. They should tell agents, in substance:

- inspect current repository/shared workflow state before assuming what work comes next
- treat Git/GitHub/tracked project policy as authoritative over a previous agent's prose summary
- use the deterministic commit helper for approved commits
- use synchronization helpers rather than recreating their Git/GitHub checks manually
- do not automatically incorporate assist work
- warn when a requested action conflicts with a project workflow constraint
- allow explicit user direction to override a soft workflow assignment when safe

Project-specific prose outside the managed block may define the actual lifecycle, for example draft PR -> implementation, ready PR -> independent review, human -> merge.

## Persistence and Leftium state

Do **not** assume a separate `.handoff/` directory.

Most state proposed in earlier drafts is already reconstructible from native sources:

- branch and commit state -> Git
- PR identity/head/base/draft/ready/reviews -> GitHub
- WIP checkpoint -> Git
- assist work -> Git branches
- project workflow -> tracked project files
- next action -> derived from the above plus project policy

Leftium's roadmap already leaves room for future project policy under `.leftium/`, but intentionally defers a general desired-state schema until a concrete workflow requires data that native files cannot represent.

This feature should preserve that discipline:

> Derive state from Git, GitHub, and tracked project policy wherever possible. Persist additional Leftium state only when a concrete operation cannot be implemented safely or idempotently without it.

If transient local state eventually proves necessary, keep it within a Leftium-owned namespace rather than introducing an unrelated root directory. Its exact location and schema are deferred.

Likewise, do not introduce machine-readable permanent agent-role assignments merely to duplicate workflow policy. Agents are selected by the user for each task.

## Result and recovery model

Human-readable mutating operations should report explicit step states such as:

- `[ok]` completed successfully
- `[already]` desired state was already present
- `[warn]` non-blocking issue
- `[fail]` attempted step failed
- `[skip]` step was not attempted because a prerequisite failed

Overall synchronization states may include:

- **READY**: the relevant side is synchronized sufficiently for the next work
- **PARTIAL**: some external effects succeeded, but a rerun or manual action is required
- **BLOCKED**: prerequisites are not satisfied and no unsafe mutation was attempted

Expected failures must include practical remediation. If a push succeeds but a later PR edit fails, rerunning must recognize the successful push instead of treating it as a new conflict.

A future machine-readable output mode should expose the same semantics without requiring agents to parse prose.

## Relationship to Leftium architecture

This work exercises several existing Leftium directions:

- **add-ons** adopt persistent project configuration, so managed `AGENTS.md` policy belongs under `le add`
- **non-adopting project operations** perform project-aware work without adopting configuration, matching status/commit/sync semantics
- **agent support** already anticipates machine-readable reports and deterministic automation
- **future .leftium policy** exists as a deferred concept and should only be introduced where native project state proves insufficient

The orchestration should be callable independently of Commander, following existing Leftium patterns. Git/GitHub/process/filesystem effects belong in the TypeScript shell. Pure classification such as sync state, WIP state, workflow observations, or result transitions are candidates for the functional core only when implementation demonstrates a useful boundary.

Do not build a provider plugin framework merely to support this workflow.

## Safety boundaries

The initial implementation must not:

- assume exactly two agents or participants
- permanently assign workflow roles to particular harnesses
- rely on a previous agent's private handoff prose as authoritative project state
- create WIP commits as part of ordinary synchronization
- silently stage, unstage, discard, or overwrite unrelated worktree changes
- automatically incorporate assist-branch commits
- automatically delete assist branches
- use an unconstrained force push
- change PR state when earlier required publication steps failed
- claim synchronization success when the required local/remote/PR relationship is unverified
- create persistent Leftium metadata merely to duplicate reconstructible Git/GitHub/native state

## Acceptance scenarios

The design should eventually be validated against at least:

1. a fresh agent/session infers the next action using only repository/shared state and project policy
2. two different agents independently infer the same workflow state from the same evidence
3. same-local-worktree session rollover that needs no commit or remote mutation
4. shared-to-local synchronization of a clean draft PR
5. repeated shared-to-local synchronization with no changes
6. local-to-shared publication of completed committed work
7. local uncommitted work correctly reported when it cannot be represented in shared state
8. deterministic scoped commit preserving unrelated staged changes
9. deterministic amend with explicit whole-commit file coverage
10. manually created exact WIP tip with no assist work
11. WIP tip with one assist branch
12. WIP tip with several independent assist branches
13. invalid assist branch that does not descend from the WIP
14. safe final-history replacement of a known remote WIP using an exact lease
15. remote WIP moves unexpectedly before replacement
16. push succeeds but later PR update fails, followed by an idempotent successful rerun
17. dirty/staged local work is preserved during shared-to-local synchronization
18. project policy requires independent review and status reports that constraint
19. the user selects different harnesses for the same workflow stage without changing project policy
20. no separate Leftium transient state is created when all required state is reconstructible
21. managed AGENTS.md policy is missing/stale and the tool gives an actionable remediation without pretending the workflow is unavailable

## Open decisions

- Whether the command namespace should be `agent`, another namespace, or selected root commands.
- Final grammar for status, commit, and sync directions.
- Whether "shared" or "pr" is the clearest user-facing name for remote Git + GitHub PR state.
- Exact managed `agents-md` preset name now that the feature is broader than handoff.
- How generic workflow-state inference should be versus project-specific policy interpretation.
- How to represent relational constraints such as independent review if plain `AGENTS.md` prose proves insufficient.
- Whether any non-reconstructible transient state is actually required and, if so, where under Leftium ownership it lives.
- Exact assist-branch naming when several branches may come from the same source/checkpoint.
- How PR discovery behaves when several open PRs or remotes are plausible.
- Exact exit-code mapping for READY, PARTIAL, and BLOCKED.
- Whether compatibility shims such as `approved-git-commit` remain external wrappers or ship with Leftium.

These should be settled by implementation fixtures and the first real integrations rather than by assumptions from the original ChatGPT/T3 workflow.
