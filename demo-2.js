/* Concept 2 — the drawer's rest position is fixed in CSS, so there is
   nothing to measure before it opens. */

const start = () => setupAgentLauncher();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
