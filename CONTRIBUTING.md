# Contributing to IceBreaker

Thank you for improving IceBreaker.

## Workflow

1. Fork the repository and create a focused branch.
2. Do not commit credentials, generated key modules, signing keys, or résumé data.
3. Keep changes small and explain the user-facing behaviour.
4. Run the local validation script.
5. Open a pull request using the provided template.

## Local validation

```bash
node scripts/github/validate-extension.mjs
bash scripts/github/pre-push-check.sh
```

On Windows:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/github/pre-push-check.ps1
```

## Pull requests

Include:

- the problem being solved;
- the implementation approach;
- testing performed;
- screenshots for visual changes;
- any new permissions or data handling.
