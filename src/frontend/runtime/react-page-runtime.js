(() => {
  "use strict";

  const h = React.createElement;
  const loadedScripts = new Map();

  function loadScript(src) {
    if (loadedScripts.has(src)) return loadedScripts.get(src);

    const pending = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.icebreakerReactController = "true";
      script.addEventListener("load", () => resolve(src), { once: true });
      script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
      document.body.appendChild(script);
    });

    loadedScripts.set(src, pending);
    return pending;
  }

  async function loadScriptsInOrder(scripts) {
    for (const src of scripts) await loadScript(src);
  }

  class ReactPageErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }

    componentDidCatch(error) {
      this.setState({ error });
      document.documentElement.dataset.icebreakerReactReady = "error";
      console.error(`[IceBreaker React] ${this.props.displayName} render failed.`, error);
    }

    render() {
      if (!this.state.error) return this.props.children;
      return h("main", { className: "react-page-error", role: "alert" },
        h("strong", null, "IceBreaker could not render this page."),
        h("p", null, "Reload the extension. Your saved settings and drafts are unchanged.")
      );
    }
  }

  class ControllerBootstrap extends React.Component {
    componentDidMount() {
      loadScriptsInOrder(this.props.controllerScripts)
        .then(() => {
          document.documentElement.dataset.icebreakerReactReady = "true";
          window.dispatchEvent(new CustomEvent("icebreaker:react-ready", {
            detail: { page: this.props.displayName }
          }));
        })
        .catch((error) => {
          document.documentElement.dataset.icebreakerReactReady = "error";
          console.error(`[IceBreaker React] ${this.props.displayName} controller initialization failed.`, error);
        });
    }

    render() {
      return this.props.children;
    }
  }

  function mount({ rootId = "react-root", App, controllerScripts = [], displayName = "IceBreaker" }) {
    const mountNode = document.getElementById(rootId);
    if (!mountNode) throw new Error(`React mount node #${rootId} was not found.`);
    if (typeof App !== "function") throw new TypeError(`A React App component is required for ${displayName}.`);

    const page = h(ReactPageErrorBoundary, { displayName },
      h(ControllerBootstrap, { controllerScripts, displayName }, h(App))
    );

    if (typeof ReactDOM.createRoot === "function") {
      ReactDOM.createRoot(mountNode).render(page);
    } else {
      ReactDOM.render(page, mountNode);
    }
  }

  window.IceBreakerReactRuntime = Object.freeze({ mount });
})();
