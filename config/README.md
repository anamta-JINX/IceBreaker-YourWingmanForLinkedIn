# Local Configuration

Copy `.env.example` to `.env` only for a private local build. The Chrome extension does not read `.env` directly; `scripts/api/Build-Official-Keys.bat` generates `src/backend/config/official-api-keys.js`.

Never commit or publish `.env` or a generated file containing real provider keys. Public releases should use the included empty runtime placeholder or a secured backend proxy.
