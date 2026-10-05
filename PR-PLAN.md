# PR Plan

Issue: #5

## Goal

Adopt the accepted Continuum 0.3 workflow in Leftium/le without changing product behavior.

## Scope

- install the accepted Continuum protocol text verbatim
- add the managed Continuum discovery block to root AGENTS.md
- add the standard durable PR-plan template and guarded finalizer
- preserve existing product specs and repository policy
- do not make unrelated product, dependency, or formatting changes

## Verify

- compare CONTINUUM.md, templates/PR-PLAN.md, and scripts/continuum-finalize-pr.sh byte-for-byte with Leftium/continuum main
- confirm AGENTS.md contains only the accepted managed discovery block unless repository-owned instructions are discovered
- confirm no runtime/product files changed
- run repository checks appropriate for documentation/workflow-only changes
