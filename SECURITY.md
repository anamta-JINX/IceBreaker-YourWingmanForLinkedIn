# Security policy

## Reporting a vulnerability

Please do not disclose security vulnerabilities or credentials in a public issue.

Send a private report to the repository owner with:

- the affected version;
- steps to reproduce;
- the expected and actual behaviour;
- screenshots or logs with every token and personal detail removed.

## Credentials

Never commit or upload:

- `config/.env`;
- `src/backend/config/official-api-keys.js`;
- Groq keys beginning with `gsk_`;
- OpenRouter keys beginning with `sk-or-`;
- Chrome extension signing keys such as `.pem` files.

If a credential is exposed, revoke it immediately, create a replacement, and remove it from Git history. Deleting it in a later commit is not sufficient.

## Public distribution

Chrome extensions are client-side packages. Any credential embedded in a ZIP or CRX can be extracted. Public releases should use user-supplied credentials or a controlled backend proxy.
