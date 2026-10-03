# Guarded project operations

**Status:** Draft design extracted from #1. Not yet an implementation milestone.

## Why

Agents often need to run a short sequence of native commands after the exact mutation has been approved. Running each command separately costs tool calls and creates awkward intermediate states; hiding them behind a replacement Git DSL makes the operation harder to inspect.

`guard` keeps native commands visible while adding a narrow execution boundary:

```text
prepare exact commands
  -> approve exact script
  -> le guard <resource>
       precondition -> snapshot -> execute -> verify -> recover/report
```

The first resource is Git. Generalize only when another concrete guarded resource appears.

## Git command shape

```sh
le guard git
```

The Git guard reads:

```text
.leftium/local/guard/git/apply-git-commands.sh
```

The agent writes that exact script, surfaces it for approval according to the current human/harness policy, then invokes `le guard git` once. The script is ephemeral execution state, not shared project policy.

`guard` protects execution; it does not decide authorization. Continuum, `AGENTS.md`, the harness, or a human may decide whether the script is approved. Guard must not infer approval or silently broaden the script.

Git still defines Git semantics. Guard should not invent replacement commit/merge/rebase/push concepts.

## Authorization and execution integrity

Approval and execution integrity are separate concerns.

An external authorizer may approve the script contents, but Guard does not know what was approved unless that authorizer supplies an expected digest or equivalent binding. The initial implementation therefore must not claim that it independently proves "the approved script" is being executed.

At invocation, Guard should:

- read the prepared script once;
- record a digest of those exact bytes;
- execute an immutable snapshot/copy of those bytes rather than rereading a mutable file;
- report the digest with the result.

This guarantees that the script Guard starts with is the script Guard executes. A later authorization integration may pass an expected digest so Guard can additionally verify that the execution snapshot matches the externally approved artifact.

## Git lifecycle

1. **Precondition**
   - resolve the repository/worktree;
   - ensure no prior guard run is active;
   - snapshot/hash the exact script bytes that will execute;
   - reject states the implementation cannot protect safely.
2. **Snapshot**
   - capture relevant HEAD/ref relationships;
   - capture index state needed to preserve unrelated staging;
   - capture active Git-operation metadata when relevant.
3. **Execute**
   - run the captured script once, without rewriting or decomposing it.
4. **Verify**
   - verify the relevant resulting HEAD/ref/index relationships;
   - return the resulting commit SHA when one was created.
5. **Recover/report**
   - restore only the Git state the guard explicitly knows how to protect;
   - never claim universal rollback of arbitrary worktree mutations;
   - report partial effects and practical remediation when restoration is incomplete.

## Initial Git safety contract

The first implementation should preserve the useful behavior of the existing machine-specific `approved-git-commit` helper:

- unrelated staged changes survive;
- unrelated dirty worktree changes are not discarded or overwritten;
- scoped commits use explicit path-scoped staging rather than accidental broad staging;
- amend is explicit;
- an amend must not silently omit paths already changed by the commit being replaced;
- merge-resolution commits account for the full staged resolution set;
- a created commit SHA is returned.

These are Git-profile verification invariants, not a replacement implementation of Git commands. The prepared script still uses native `git commit`, `git commit --amend`, `git merge`, or other supported Git operations. The Git guard may inspect repository state before and after execution to enforce safety invariants, but it should not decide how those operations are performed.

Conventional Commit subject validation may remain as a Git-profile policy, but its exact configurability is an implementation decision.

Do not parse arbitrary shell deeply enough to create a second Git language. Prefer a narrow initially supported command/script contract plus pre/post verification.

Remote ref mutation is outside the initial local recovery guarantee. A future guarded push or non-fast-forward ref replacement must require an exact expected remote SHA/lease and must not imply that a local snapshot can roll back remote side effects.

## Failure and idempotency

Results must distinguish:

- completed and verified;
- completed but verification incomplete;
- blocked before mutation;
- already applied / no longer applicable;
- failed with protected state restored;
- failed with partial effects requiring manual recovery.

Generated change sets should be practically idempotent. When an operation depends on a known starting state, the script should encode an expected HEAD/ref or equivalent precondition so that rerunning an already applied operation does not repeat the mutation.

After partial/external failure, rerun logic must inspect current state rather than blindly replay a mutation that may already have succeeded.

Machine-readable output should reuse Leftium's eventual shared result model rather than inventing a guard-only protocol.

## Generalization

`le guard <resource>` is deliberately generic, but each resource owns its preconditions, protected snapshot, native script, verification, and narrow recovery semantics.

Do not build a generic transaction engine, universal rollback layer, or resource plugin SDK before a second real resource demonstrates a reusable boundary.

## Relationship to Continuum

Guard must not understand Continuum.

Continuum decides whether and when work is permitted. `le guard git` protects execution of an already-authorized local Git mutation. Either can exist without the other.

## Non-goals

- no Leftium Git DSL;
- no approval inference;
- no automatic commit merely because a handoff occurs;
- no universal filesystem rollback;
- no initial promise to roll back remote Git effects;
- no WIP/assist-branch workflow from #1;
- no multi-writer coordination;
- no provider-specific agent behavior.

## Acceptance scenarios

Cover at least:

1. scoped commit with unrelated staged changes;
2. scoped commit with unrelated unstaged changes;
3. commit returns its SHA;
4. amend preserves the complete prior commit path set;
5. unsafe incomplete amend is rejected;
6. merge-resolution commit handles the full staged set;
7. script failure restores protected Git state;
8. mutation succeeds but later verification fails, followed by safe inspection/rerun;
9. the exact script bytes captured at invocation are the bytes executed;
10. rerunning an already-applied change set does not repeat the mutation;
11. operation works without Continuum.

## Open decisions

- initial supported Git command/script subset;
- exact snapshot strategy;
- authorization digest handoff, if any;
- cleanup policy for `.leftium/local/guard/...`;
- Conventional Commit validation policy;
- shared structured result schema;
- later remote-mutation guard semantics and recovery limits.
