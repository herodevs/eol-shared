## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Formatting

```bash
npm run format:check
npm run format:write
```

### Releasing

1. Wait for `release-build` pipeline step to finish post push to `main`
2. `git fetch origin && git switch release-build && git pull`
3. `git tag v<INSERT_SEMVER_HERE>`
4. `git push origin <tag name>`
