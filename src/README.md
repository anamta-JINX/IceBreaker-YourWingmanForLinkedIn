# Source Architecture

IceBreaker is organized into two clear runtime layers while remaining a load-unpacked Manifest V3 extension with no build step required.

```text
src/
├── backend/
│   ├── background/   # Service worker, providers, state, commands and orchestration
│   ├── config/       # Runtime API-key placeholder and safe example
│   └── content/      # LinkedIn extraction, hover detection and page automation
└── frontend/
    ├── options/      # React settings and Autopilot configuration page
    ├── runtime/      # Shared React page bootstrap and error boundary
    ├── shared/       # Résumé parsing and browser-side storage helpers
    ├── sidepanel/    # React side panel and its existing controllers/styles
    └── vendor/       # Locally bundled React/ReactDOM for Manifest V3 CSP
```

The frontend owns only user-facing extension pages. The backend owns background orchestration and LinkedIn-page integration. Existing controller files remain intact to preserve behavior while React renders the UI structure.
