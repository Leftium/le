# Leftium

Leftium applies project conventions through add-ons. The currently implemented built-in operation is `le add license`, which adds or reconciles an MIT license. Creation and the remaining v0 add-ons are still in progress; see the [active spec](specs/10-leftium/00-spec.md).

Install the published CLI with Node 24:

```sh
pnpm add -g leftium

le --version
le --help
le add license
```

`leftium` and `le` are aliases for the same executable. Use `le add license` in the directory you want to license, or pass `-C /path/to/project`.

The selected directory can be empty and needs neither Git nor `package.json`. An equivalent license is preserved, including an alternate filename. Different or customized content requires interactive confirmation or `--force`; inconsistent multiple license files must be resolved manually. If the selected directory has a `package.json`, only its license field is updated. Ancestor package manifests are not edited.

Useful options:

```sh
le add license -C ./project --non-interactive --author "Your Name"
le add license -C ./project --force --author "Your Name" --year 2020-2026
le add license -C ./packages/app --package-license --author "Your Name"
```

Explicit author and year values win. Otherwise, an existing canonical MIT notice supplies them; author inference then tries the target package author and Git's configured name. A new notice defaults to the current year. Missing author input prompts in a terminal and fails in automation. `--package-license` explicitly permits a separate license in a workspace package when an ancestor license exists; `--force` alone does not make that scope choice. This slice recognizes npm/Yarn workspace globs and explicit pnpm workspace package lists.

`--no-install` is accepted; the license operation needs no package installation. Completed applied/no-op requests exit zero. Conflicts, unsupported requests, cancellation, and failures exit nonzero. Failures can leave partial output; the report names affected files. Leftium does not stage or commit changes.

## Development

Use Node 24 and pnpm 12.3.4:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start add license -C /path/to/project --author "Your Name" --year 2026
```

```sh
pnpm test       # compile both languages, then run Node fixture and unit tests
pnpm typecheck  # generate the ReScript boundary and check TypeScript
```

After an initial build, use two terminals for incremental compilation:

```sh
pnpm dev:rescript
pnpm dev:typescript
```

TypeScript owns discovery, prompts, file edits, and reporting. [License.res](src/addons/license/License.res) owns MIT rendering, state classification, and reconciliation decisions. [runAdd](src/orchestration/add.ts) accepts ordinary requests without Commander, so tests and the CLI share orchestration.

ReScript's [genType integration](https://rescript-lang.org/docs/manual/typescript-integration/) generates the typed import used by TypeScript. Generated `.res.js`, `.gen.tsx`, and `dist/` files are ignored and rebuilt locally. Edit the `.res` source instead of those generated files. The build uses the ReScript compiler and `tsc` directly, without a bundler.

The first boundary needs no handwritten representation adapter: TypeScript narrows the generated decision union by its `TAG`. Pure tests exercise it without filesystem setup, and TypeScript source maps support shell debugging. ReScript calculations can currently be inspected in their readable generated JavaScript; source-level ReScript debugging has not been established. The richer creation request/recipe model remains the second test of whether this split is useful before extracting a shared add-on API.
