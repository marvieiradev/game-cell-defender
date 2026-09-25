// Ponto de entrada: cria o jogo, mostra o menu inicial e inicia o loop.

import { Game } from "./game.js";
import { Save } from "./save.js";
import { formatTime } from "./utils.js";

const canvas = document.getElementById("game");
const game = new Game(canvas);
window.game = game; // útil para depuração

game.ui.showOverlay(
  "Cell Defender",
  "Uma infecção avança sobre o organismo. Você é a célula defensora: colete energia, forme organelos e proteja o Núcleo Celular. " +
    "Mova-se com WASD ou com o joystick (metade esquerda da tela). O ataque é automático.",
  "Jogar"
);

// Recordes salvos
if (Save.data.bestWave > 0) {
  document.getElementById("ov-records").textContent = `Recorde: Invasão ${
    Save.data.bestWave
  } · ${formatTime(Save.data.bestTime)}`;
}

game.loop = game.loop.bind(game);
game.lastTs = performance.now();
requestAnimationFrame(game.loop);

// Libera o áudio no primeiro toque (política dos navegadores).
window.addEventListener("pointerdown", () => game.audio.unlock(), { once: true });
