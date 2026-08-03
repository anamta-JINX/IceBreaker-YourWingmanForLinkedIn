(() => {
  "use strict";

  window.IceBreakerReactRuntime.mount({
    rootId: "react-root",
    App: window.IceBreakerSidepanel.App,
    displayName: "sidepanel",
    controllerScripts: ["./sidepanel.js"]
  });
})();
