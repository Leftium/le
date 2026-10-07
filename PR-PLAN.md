# Release SHA stamping

Implement issue #14: couple each published CLI's default Pages workflow to its final release commit without a self-referential source pin.

## Approach

- Keep a source placeholder and stamp only compiled output. Local builds use checkout HEAD; release builds require an explicit release SHA equal to GITHUB_SHA and HEAD.
- Pack once, extract and verify the package's generated caller and explicit override, then publish that verified tarball with the existing trusted-publishing/retry flow.
- Reject Pages workflow changes without a package version change in PR CI and main push validation.
- Bump the package patch version and document release coupling and legacy v1 history.

## Checkpoints and verification

1. Implement stamping, artifact verification, version guard, workflows, and focused failure tests. Run repository tests, typecheck, build, and formatting checks; pack and verify a simulated release artifact without publishing.
2. Review against issue #14, update durable results, release the lease, mark Ready, and remove the temporary plan using the cleanup-only finalizer.

The user controls merge and actual publishing/release operations.
