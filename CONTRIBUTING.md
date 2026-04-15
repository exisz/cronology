# Contributing to Cronology

Thanks for your interest in contributing! 🎉

## How to Contribute

### Reporting Bugs

- Open an [issue](https://github.com/exisz/cronology/issues) with a clear title
- Include steps to reproduce, expected vs actual behavior
- Include your Node.js version and OS

### Suggesting Features

- Open an issue with the `enhancement` label
- Describe the use case, not just the solution
- Check existing issues first

### Pull Requests

1. Fork the repo
2. Create a branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run `pnpm build` to verify
5. Commit with a clear message
6. Push and open a PR

### Writing Templates

Custom watcher templates are the best way to extend cronology:

1. Create a new file in `src/core/templates/`
2. Implement the `WatcherTemplate` interface
3. Register it in `src/core/templates/index.ts`
4. Add tests if possible

See `src/core/templates/http-status.ts` for a reference implementation.

## Development Setup

```bash
git clone https://github.com/exisz/cronology.git
cd cronology
pnpm install
pnpm dev    # Start dev server with hot reload
```

## Code Style

- TypeScript strict mode
- All business logic in `src/core/` — CLI and API are thin wrappers
- Keep dependencies minimal

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
