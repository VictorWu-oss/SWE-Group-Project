## Code formatting (Prettier)

We use Prettier to format our code. The settings can be found in
`.prettierrc` at the root pf the repo:

- Indentation: 2 spaces (default)
- Tabs: no, spaces only (default)
- Semicolons: yes
- Quotes: double
- Trailing commas: none
- Line length: 64 characters
- Markdown/prose wrapping: always wrap at the line length
- HTML whitespace: ignored

To format all files, run this from the root:
npm run format

## Linting (ESLint)

ESLint only checks JavaScript files, and it is configured
separately in each package with an `eslint.config.js` file:

- `packages/react-frontend` (includes React plugins)
- `packages/express-backend`

To cherck your code, run this in the folder youre working in:
npm eslint .
