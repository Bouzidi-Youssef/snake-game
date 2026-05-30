import { subscribe, getState } from "./game/game.js";
import { initInput } from "./systems/input.js";
import { render } from "./ui/renderer.js";

document.addEventListener("DOMContentLoaded", () => {
  const appContainer = document.getElementById("app");

  if (!appContainer) return;

  // Subscribe the renderer to state changes
  subscribe((state) => {
    render(appContainer, state);
  });

  // Initialize input system
  initInput();

  // Draw the initial screen (Menu)
  render(appContainer, getState());
});
