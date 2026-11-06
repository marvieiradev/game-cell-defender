// Catálogo central de imagens opcionais.
// Defina `src` para trocar o desenho procedural por PNG, WebP, JPG ou SVG.
// Caminhos relativos partem de /game/ (ex.: "./assets/sprites/player.png").
export const SPRITE_CONFIG = {
  player: { src: "", width: 38, height: 46, offsetY: -3, flipWithDirection: true },
  core: { src: "", width: 104, height: 104, offsetY: 0 },
  enemies: {
    grunt: { src: "", width: 34, height: 34, offsetY: 0 },
    runner: { src: "", width: 30, height: 30, offsetY: 0 },
    brute: { src: "", width: 48, height: 48, offsetY: 0 },
    shade: { src: "", width: 38, height: 38, offsetY: 0 },
    boss: { src: "", width: 76, height: 76, offsetY: -5 },
  },
  organelles: {
    mine: { src: "", width: 66, height: 54, offsetY: -4 },
    tower: { src: "", width: 62, height: 68, offsetY: -10, rotateToTarget: false },
    barracks: { src: "", width: 58, height: 58, offsetY: -4 },
    hospital: { src: "", width: 58, height: 58, offsetY: -4 },
    academy: { src: "", width: 58, height: 58, offsetY: -4 },
    workshop: { src: "", width: 58, height: 58, offsetY: -4 },
    sanctuary: { src: "", width: 58, height: 58, offsetY: -4 },
    forge: { src: "", width: 58, height: 58, offsetY: -4 },
  },
};

const loaded = new Map();

function entries() {
  return [
    ["player", SPRITE_CONFIG.player],
    ["core", SPRITE_CONFIG.core],
    ...Object.entries(SPRITE_CONFIG.enemies).map(([id, config]) => [`enemy:${id}`, config]),
    ...Object.entries(SPRITE_CONFIG.organelles).map(([id, config]) => [`organelle:${id}`, config]),
  ];
}

function loadImage(key, config) {
  if (!config?.src) return Promise.resolve();
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      loaded.set(key, image);
      resolve();
    };
    image.onerror = () => {
      console.warn(`[sprites] Não foi possível carregar: ${config.src}. Usando desenho padrão.`);
      resolve();
    };
    image.src = config.src;
  });
}

export async function preloadSprites() {
  await Promise.all(entries().map(([key, config]) => loadImage(key, config)));
}

export function getSprite(category, id) {
  const key = id ? `${category}:${id}` : category;
  let config;
  if (category === "enemy") config = SPRITE_CONFIG.enemies[id];
  else if (category === "organelle") config = SPRITE_CONFIG.organelles[id];
  else config = SPRITE_CONFIG[category];
  const image = loaded.get(key);
  return image && config ? { image, config } : null;
}

/** Desenha uma imagem centralizada e devolve true; sem imagem, devolve false. */
export function drawConfiguredSprite(ctx, category, id, options = {}) {
  const sprite = getSprite(category, id);
  if (!sprite) return false;

  const { image, config } = sprite;
  const scale = options.scale ?? 1;
  const width = (options.width ?? config.width ?? image.naturalWidth) * scale;
  const height = (options.height ?? config.height ?? image.naturalHeight) * scale;
  const offsetX = options.offsetX ?? config.offsetX ?? 0;
  const offsetY = options.offsetY ?? config.offsetY ?? 0;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  if (options.rotation) ctx.rotate(options.rotation);
  if (options.flipX) ctx.scale(-1, 1);
  if (options.alpha !== undefined) ctx.globalAlpha *= options.alpha;
  if (options.flash) ctx.filter = "brightness(2.8) saturate(0)";
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
  return true;
}