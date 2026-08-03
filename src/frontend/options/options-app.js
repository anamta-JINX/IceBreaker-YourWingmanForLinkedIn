(() => {
  "use strict";

  window.IceBreakerReactRuntime.mount({
    rootId: "react-root",
    App: window.IceBreakerOptions.App,
    displayName: "options",
    controllerScripts: [
      "../shared/resume-parsers.js",
      "../shared/resume-store.js",
      "./options.js",
      "./autopilot-settings.js"
    ]
  });
})();
