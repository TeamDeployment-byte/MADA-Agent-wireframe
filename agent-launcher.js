/*
 * Shared launcher for the MADA agent concepts. Both demos open the same
 * agent in the same overlay; only the CSS decides whether it arrives as a
 * modal or a drawer. `onMeasure` lets a concept write geometry (demo 1
 * aims the panel at the button) before the opening frame is committed.
 */
function setupAgentLauncher({ onMeasure } = {}) {
  const fab = document.getElementById("agent-fab");
  const overlay = document.getElementById("agent-overlay");
  const modal = document.getElementById("agent-modal");
  const scrim = document.getElementById("agent-scrim");
  const closeBtn = document.getElementById("agent-close");
  const frame = document.getElementById("agent-iframe");
  if (!fab || !overlay || !modal) return;

  let lastFocus = null;

  const measure = () => onMeasure?.({ fab, modal });

  const open = () => {
    if (overlay.classList.contains("is-open")) return;
    lastFocus = document.activeElement;

    // Load on first open so the agent's own intro plays as the panel lands.
    if (!frame.src) frame.src = frame.dataset.src;

    overlay.removeAttribute("inert");
    measure();
    // Commit the closed state before releasing it, or the browser coalesces
    // both into one frame and nothing animates.
    void modal.offsetWidth;

    overlay.classList.add("is-open");
    document.body.classList.add("agent-open");
    fab.setAttribute("aria-expanded", "true");
    closeBtn.focus({ preventScroll: true });
  };

  const close = () => {
    if (!overlay.classList.contains("is-open")) return;
    measure();
    overlay.classList.remove("is-open");
    document.body.classList.remove("agent-open");
    fab.setAttribute("aria-expanded", "false");

    // Focus must leave the subtree before `inert` lands on it. Anything
    // that is gone, or was never really focused (body), hands back to the
    // launcher rather than dropping focus to the top of the page.
    const returnTo =
      lastFocus instanceof HTMLElement &&
      lastFocus !== document.body &&
      lastFocus.isConnected
        ? lastFocus
        : fab;
    returnTo.focus({ preventScroll: true });

    const done = () => overlay.setAttribute("inert", "");
    overlay.addEventListener("transitionend", done, { once: true });
    setTimeout(done, 800); // transitionend can be skipped on a hidden tab
  };

  fab.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  scrim.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });

  // The agent runs in an iframe, so Escape inside it never reaches us.
  window.addEventListener("message", (e) => {
    if (e.source === frame.contentWindow && e.data === "mada:close") close();
  });

  window.addEventListener("resize", () => {
    if (!overlay.classList.contains("is-open")) measure();
  });

  measure();
}
