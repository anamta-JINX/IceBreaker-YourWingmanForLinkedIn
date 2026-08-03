# IceBreaker API key setup

## Official API mode

1. Open `.env` in the extension folder.
2. Paste two Groq keys and two OpenRouter keys into the four provided slots.
3. Run `scripts/api/Build-Official-Keys.bat`.
4. Reload the extension from `chrome://extensions`.
5. In IceBreaker Settings, select **Official API**.

IceBreaker starts each request with the next key in the provider pool. If a key receives an authentication, rate-limit, timeout, temporary server, or capacity error, it tries the other official key.

## Manual API mode

1. Open IceBreaker Settings.
2. Select **Manual API**.
3. Paste one key.
4. A `gsk_` key is detected as Groq. An `sk-or-` key is detected as OpenRouter.
5. Save settings.

The side panel then displays **My Groq** or **My OpenRouter** with the provider logo. Official provider buttons continue to use the official key pool.

## Security warning

A `config/.env` file is not read directly by a Chrome extension. The build script converts it into `src/backend/config/official-api-keys.js`, which is bundled with the extension. Anyone who can inspect the extension package can extract those keys. For a public release, use a backend proxy with authentication, quotas, revocation, and per-user rate limits instead of distributing provider keys.
