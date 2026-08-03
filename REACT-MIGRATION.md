# React frontend architecture

IceBreaker now uses React for the two visible extension pages while preserving the established Chrome-extension logic.

## React applications

- `src/frontend/sidepanel/sidepanel-components.js` contains the side-panel component tree.
- `src/frontend/options/options-components.js` contains the settings component tree.
- `src/frontend/sidepanel/sidepanel-app.js` and `src/frontend/options/options-app.js` mount those applications.
- `src/frontend/runtime/react-page-runtime.js` provides the shared mount, error boundary, and ordered controller bootstrap.
- `src/frontend/vendor/` contains local production React and ReactDOM files, so the extension uses no remote runtime code.

The page components are real React elements. They do not inject the former page through `dangerouslySetInnerHTML`.

## Compatibility layer

The existing controllers still own the mature extension behavior:

- `sidepanel.js`
- `options.js`
- `autopilot-settings.js`

React renders every required element first. The shared bootstrap then loads the controllers in order, allowing their existing DOM bindings and Chrome APIs to work exactly as before.

The migration preserves:

- visual structure and CSS selectors;
- all 218 frontend element IDs;
- Chrome storage keys and runtime messages;
- LinkedIn hover detection and content extraction;
- AI providers and generation behavior;
- résumé parsing and storage;
- Autopilot behavior;
- keyboard shortcuts;
- the service worker and content script.

## Validation

Run:

```bash
npm run validate
```

The validation checks the Manifest V3 paths, compares the React element trees with the retained static reference pages, rejects legacy HTML-template injection, and verifies that every controller `getElementById` dependency still exists.

The original static DOM structure is retained as a compact validation contract in `scripts/contracts/frontend-dom-contract.json`; redundant HTML backups are not shipped.
