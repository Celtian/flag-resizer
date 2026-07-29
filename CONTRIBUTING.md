# Contributing

Use Node.js 22 or newer and Bun 1.3.14. Install the frozen dependency graph:

```sh
bun ci
```

Run the complete validation suite before submitting a change:

```sh
bun run check
```

The pre-commit hook runs ESLint and Prettier on staged files. The commit-message
hook enforces Conventional Commits through Quick Commitlint. These hooks provide
fast feedback but do not replace the complete validation suite.

Behavior changes should include tests. Public CLI, configuration, generated
manifest, or programmatic API changes should also update the README. Do not
commit generated PNG or WebP assets to this repository.

Changes to bundled Twemoji graphics or attribution must preserve the
CC-BY-4.0 license and required attribution.

## Pull requests

Keep pull requests focused and explain the reason for the change. Before
requesting review:

1. Perform a self-review.
2. Add or update relevant tests.
3. Run `bun run check`.
4. Smoke-test affected CLI commands.
5. Update documentation for public-facing changes.

Please follow the [Code of Conduct](./CODE_OF_CONDUCT.md) in all project
interactions. Report vulnerabilities according to the
[Security Policy](./SECURITY.md).
