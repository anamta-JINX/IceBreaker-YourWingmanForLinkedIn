# IceBreaker Architecture

IceBreaker uses a frontend/backend folder split suited to a Chrome Manifest V3 extension.

## Frontend

`src/frontend/` contains the user-facing React side panel and settings page, local React runtime files, résumé helpers used by settings, and all page styles/controllers. React is bundled locally because Manifest V3 blocks remotely hosted executable code.

## Backend

`src/backend/` contains the service worker, provider orchestration, commands, storage/state coordination, and the LinkedIn content script responsible for context detection and safe page interaction.

## Runtime model

There is no remote application server in this repository. “Backend” refers to the extension's non-visual execution layer. The package remains directly loadable through `chrome://extensions` without npm installation or a compilation step.
