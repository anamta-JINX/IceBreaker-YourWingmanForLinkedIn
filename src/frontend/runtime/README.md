# IceBreaker React runtime

This runtime mounts the side-panel and settings React applications, catches render failures, and loads their existing controllers only after the component tree has committed.

It supports both `ReactDOM.createRoot` and the legacy `ReactDOM.render` fallback. React and ReactDOM are vendored locally under `src/frontend/vendor/` to comply with Manifest V3 restrictions on remote executable code.
