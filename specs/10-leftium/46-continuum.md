# Continuum integration

**Status:** Draft design extracted from #1 after workflow semantics moved to the independent [Continuum](https://github.com/Leftium/continuum) protocol. Not yet an implementation milestone.

## Boundary

Continuum defines workflow semantics. Git/GitHub hold live shared state. Leftium supplies local installation, inspection, and maintenance tooling.

```text
Continuum -> protocol meaning
Git/GitHub -> shared state
le -> install, inspect, maintain
```

Leftium must not fork or independently redefine Continuum's lifecycle.

## Installation

```sh
le add continuum
```

This adopting operation installs/reconciles the artifacts required by the targeted protocol version, currently:

- repository-root `CONTINUUM.md`;
- a small managed Continuum pointer inside repository-root `AGENTS.md`.

It must preserve unrelated `AGENTS.md` content, own only an explicit managed block, be idempotent, and stop on conflicting unowned content rather than overwriting it.

Do not fetch a mutable template from Continuum `main` at runtime. A released Leftium version should target a known protocol/template version or another reproducible source.

## Inspection

Current candidate:

```sh
le continuum check
```

This is read-only. It should inspect enough local and GitHub evidence to decide whether the project is coherent under the installed/supported Continuum protocol, including where relevant:

- installed protocol version and managed-file health;
- local branch/HEAD/index and dirty or unpublished state;
- repository/remotes;
- linked/open issue and implementation PR;
- PR base/head and Draft/Ready state;
- local HEAD vs remote branch vs PR head;
- dependency/blocking relationships;
- review state that affects the next protocol action.

Apply Continuum's authoritative-state and next-action rules. Do not invent parallel Leftium workflow stages.

A successful check should be trustworthy enough that an agent does not repeat the same Git/GitHub consistency checks merely to verify Leftium's verification.

## Ambiguity

Never guess when several repositories, remotes, issues, or PRs are plausible. Report a blocked/actionable result and the candidates.

Do not persist Leftium metadata merely to duplicate relationships already reconstructable from Git/GitHub.

## Local vs shared state

Report visibility boundaries without manufacturing checkpoints:

- dirty local work may continue in the same worktree;
- hosted/GitHub-only agents cannot see uncommitted local work;
- local committed-but-unpushed work is not yet shared;
- fetched remote work needs no new local commit.

`check` must not silently commit, push, or mutate PR state to make the views agree.

## Protocol update

Current candidate:

```sh
le continuum update
```

This updates installed Continuum artifacts between supported protocol/template versions while preserving project-owned content.

It migrates protocol installation, not live workflow state. It must not rewrite issues, branches, commits, or PR lifecycle state merely because a template version changed.

Before implementation, define version detection, supported migration paths, conflict behavior for customized managed content, and how the targeted protocol version is declared.

## Remote mutations

PR #1 proposed a generic bidirectional `sync`. Do not preserve that command merely for compatibility with the old design. Most coordination remains ordinary Git/GitHub operations interpreted by Continuum.

If a later `le continuum ...` command automates publication or another remote mutation, it must:

- validate expected repository/branch/PR identity first;
- preserve unrelated local state;
- expose each external step;
- verify resulting state;
- be idempotent after partial success;
- stop dependent mutations after a required failure;
- never use unconstrained force push;
- report remediation for partial effects.

It may use `le guard git` for approved local Git execution, but Continuum does not depend on guard as a protocol feature.

## Result model

Useful states include healthy/ready, blocked, protocol drift/outdated installation, local-only/unpublished work, and partial external mutation.

Reuse Leftium's general execution/verification result model. A future `--json` form should expose structured observations and next actions without prose parsing. Automation must not mistake blocked or partial state for verified success.

## Relation to generic lifecycle commands

The roadmap already reserves generic `le check` and `le update`. Until their aggregation semantics are concrete, keep the scoped candidates explicit:

```sh
le continuum check
le continuum update
```

Generic lifecycle commands may later aggregate this integration without changing its contract.

## Explicitly not migrated from #1

Deferred unless Continuum later adopts equivalent concepts:

- exact `WIP` commit semantics;
- `assist/<source>/...` branches;
- multiple concurrent writers;
- destination-specific `--for chatgpt`;
- provider-specific permanent roles;
- generic `le agent status/commit/sync`.

## Acceptance scenarios

Cover at least:

1. fresh and repeated `le add continuum`;
2. unrelated `AGENTS.md` prose survives install/update;
3. malformed/conflicting managed block is actionable;
4. `check` identifies protocol version;
5. clean local/remote/PR heads agree;
6. uncommitted local work is reported local-only without committing;
7. committed-but-unpushed work is distinguished from shared state;
8. ambiguous remotes/PRs block instead of guessing;
9. Draft/Ready and dependency state are interpreted via Continuum;
10. repeated checks are mutation-free;
11. protocol update preserves project-owned content;
12. a future partial remote mutation can be safely inspected/rerun;
13. no extra metadata is created when native state is sufficient.

## Open decisions

- versioned template packaging/source;
- first supported Continuum protocol version;
- explicit discovery/disambiguation grammar;
- GitHub CLI vs direct API support;
- later aggregation into generic `check/update`;
- structured observation/result schema.
