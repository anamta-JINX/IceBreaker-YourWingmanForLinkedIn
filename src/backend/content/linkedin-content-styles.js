(() => {
  "use strict";

  const STYLE_ID = "icebreaker-linkedin-content-styles";
  const CSS_TEXT = String.raw`.icebreaker-hover-badge {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 94px;
  padding: 7px 10px;
  border: 1px solid rgba(10, 102, 194, 0.24);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  color: #0a66c2;
  font: 600 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  transition: opacity 150ms ease, transform 150ms ease;
}

.icebreaker-hover-badge.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.icebreaker-hover-badge img {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.icebreaker-autopilot-active-card {
  outline: 3px solid #0a66c2 !important;
  outline-offset: 3px !important;
  border-radius: 10px !important;
  box-shadow: 0 0 0 5px rgba(10, 102, 194, 0.14) !important;
  transition: outline-color 160ms ease, box-shadow 160ms ease !important;
}

/* Cursor-following IceBreaker status popups are intentionally disabled. */
.icebreaker-hover-badge,
.icebreaker-hover-badge.is-visible {
  display: none !important;
}
`;
  const target = document.head || document.documentElement;
  if (!target) return;

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.setAttribute("data-icebreaker-style", "linkedin-content");
    target.appendChild(style);
  }

  // Reassign on every load so extension reloads update an already-open page.
  if (style.textContent !== CSS_TEXT) style.textContent = CSS_TEXT;
})();
