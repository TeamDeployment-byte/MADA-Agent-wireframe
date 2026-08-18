/* Concept 1 — the panel flies out of the launcher and settles centred. */

/*
 * Map the panel onto the launcher. The panel is centred by the overlay, so
 * its centre is the viewport centre — computing from that beats measuring a
 * transformed box, which reports the already-scaled rect.
 */
function aimAtFab({ fab, modal }) {
  const f = fab.getBoundingClientRect();
  modal.style.setProperty(
    "--fab-dx",
    `${f.left + f.width / 2 - window.innerWidth / 2}px`,
  );
  modal.style.setProperty(
    "--fab-dy",
    `${f.top + f.height / 2 - window.innerHeight / 2}px`,
  );
  modal.style.setProperty(
    "--fab-scale",
    String(Math.max(f.width / modal.offsetWidth, 0.04)),
  );
}

const start = () => setupAgentLauncher({ onMeasure: aimAtFab });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
