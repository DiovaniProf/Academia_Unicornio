"use strict";

/* =========================================================
   ESTRUTURA DO PROJETO

   Todos os arquivos devem ficar juntos, sem pasta:

   index.html
   style.css
   script.js
   capa.jpg
   img01.jpg até img20.jpg

   O código também aceita:
   .jpeg / .png / .webp
========================================================= */

const TOTAL_PAIRS = 10;

const ROOT_URL = new URL("./", document.baseURI);

const SUPPORTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp"
];

const CARD_BACK_ID = "capa";

const CARD_BACK_BASE_NAMES = [
  "capa",
  "CAPA"
];

const $ = (id) => document.getElementById(id);

/* =========================================================
   ORGANIZAÇÃO DOS PARES

   img01 + img02
   img03 + img04
   ...
   img19 + img20

   As duas imagens do mesmo par devem ser iguais.
========================================================= */

const PAIR_DATA = [
  { pair: 1, first: "img01", second: "img02", label: "Cena 1" },
  { pair: 2, first: "img03", second: "img04", label: "Cena 2" },
  { pair: 3, first: "img05", second: "img06", label: "Cena 3" },
  { pair: 4, first: "img07", second: "img08", label: "Cena 4" },
  { pair: 5, first: "img09", second: "img10", label: "Cena 5" },
  { pair: 6, first: "img11", second: "img12", label: "Cena 6" },
  { pair: 7, first: "img13", second: "img14", label: "Cena 7" },
  { pair: 8, first: "img15", second: "img16", label: "Cena 8" },
  { pair: 9, first: "img17", second: "img18", label: "Cena 9" },
  { pair: 10, first: "img19", second: "img20", label: "Cena 10" }
];

const CARDS = PAIR_DATA.flatMap((item) => [
  {
    id: item.first,
    pair: item.pair,
    label: item.label,
    alt: `Cena do par ${String(item.pair).padStart(2, "0")}`
  },
  {
    id: item.second,
    pair: item.pair,
    label: item.label,
    alt: `Cena do par ${String(item.pair).padStart(2, "0")}`
  }
]);

const RESOURCES = [
  ...CARDS.map((card) => ({
    id: card.id,
    baseNames: [card.id],
    pair: card.pair,
    label: card.label,
    isCover: false
  })),
  {
    id: CARD_BACK_ID,
    baseNames: CARD_BACK_BASE_NAMES,
    pair: 0,
    label: "Academia Unicórnio",
    isCover: true
  }
];

/* =========================================================
   ELEMENTOS
========================================================= */

const startScreen = $("startScreen");
const gameScreen = $("gameScreen");

const previewImages = [
  $("previewImage1"),
  $("previewImage2"),
  $("previewImage3")
];

const imageCache = new Map();
const fallbackCache = new Map();
const scheduledTimeouts = new Set();

/* =========================================================
   ESTADO DO JOGO
========================================================= */

let resourcesReady = false;
let missingFiles = 0;
let previousPreviewIds = [];

let firstCard = null;
let secondCard = null;
let boardLocked = false;

let moves = 0;
let matchedPairs = 0;
let elapsedSeconds = 0;
let timerId = null;
let gameSessionId = 0;

/* =========================================================
   ENDEREÇOS DAS IMAGENS
========================================================= */

function buildCandidateUrls(baseNames) {
  return baseNames.flatMap((baseName) =>
    SUPPORTED_EXTENSIONS.map((extension) =>
      new URL(`${baseName}${extension}`, ROOT_URL).href
    )
  );
}

function tryLoadUrl(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(url);
    image.onerror = () =>
      reject(new Error(`Não foi possível carregar: ${url}`));

    image.src = url;
  });
}

async function findExistingImage(baseNames) {
  const candidates = buildCandidateUrls(baseNames);

  for (const candidate of candidates) {
    try {
      return await tryLoadUrl(candidate);
    } catch (error) {
      // tenta a próxima possibilidade
    }
  }

  return null;
}

/* =========================================================
   IMAGENS PROVISÓRIAS
========================================================= */

function createFallback(resource) {
  const key = resource.isCover ? "cover" : `pair-${resource.pair}`;

  if (fallbackCache.has(key)) {
    return fallbackCache.get(key);
  }

  const label = resource.isCover
    ? "ACADEMIA"
    : String(resource.pair).padStart(2, "0");

  const subtitle = resource.isCover
    ? "UNICÓRNIO"
    : "IMAGEM SERÁ INSERIDA";

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="960"
      height="540"
      viewBox="0 0 960 540"
    >
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#1a1430" />
          <stop offset=".55" stop-color="#171f45" />
          <stop offset="1" stop-color="#2d1650" />
        </linearGradient>

        <radialGradient id="glow" cx="50%" cy="40%" r="65%">
          <stop stop-color="#ffffff" stop-opacity=".18" />
          <stop offset=".45" stop-color="#ff6adf" stop-opacity=".18" />
          <stop offset=".75" stop-color="#65e8ff" stop-opacity=".18" />
          <stop offset="1" stop-color="#ffd86b" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect width="960" height="540" rx="28" fill="url(#bg)" />
      <rect x="18" y="18" width="924" height="504" rx="22" fill="none" stroke="#ffd86b" stroke-width="6" />
      <rect x="34" y="34" width="892" height="472" rx="17" fill="none" stroke="#65e8ff" stroke-opacity=".65" stroke-width="2" />

      <ellipse cx="480" cy="245" rx="250" ry="165" fill="url(#glow)" />

      <g transform="translate(480 232)">
        <g fill="#fff6bb" stroke="#ffd86b" stroke-width="2">
          <polygon points="0,-82 14,-18 82,0 14,18 0,82 -14,18 -82,0 -14,-18"/>
        </g>

        <g transform="translate(-118,72) scale(.55)" fill="#ffcaec">
          <polygon points="0,-56 10,-12 56,0 10,12 0,56 -10,12 -56,0 -10,-12"/>
        </g>

        <g transform="translate(118,72) scale(.55)" fill="#bdf7ff">
          <polygon points="0,-56 10,-12 56,0 10,12 0,56 -10,12 -56,0 -10,-12"/>
        </g>

        <g transform="translate(-158,-42) scale(.35)" fill="#ffd86b">
          <polygon points="0,-56 10,-12 56,0 10,12 0,56 -10,12 -56,0 -10,-12"/>
        </g>

        <g transform="translate(158,-42) scale(.35)" fill="#ffffff">
          <polygon points="0,-56 10,-12 56,0 10,12 0,56 -10,12 -56,0 -10,-12"/>
        </g>
      </g>

      <text
        x="480"
        y="420"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-size="62"
        font-weight="900"
        fill="#ffffff"
      >
        ${label}
      </text>

      <text
        x="480"
        y="468"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="24"
        font-weight="900"
        letter-spacing="4"
        fill="#ffd86b"
      >
        ${subtitle}
      </text>
    </svg>
  `;

  const source =
    "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);

  fallbackCache.set(key, source);

  return source;
}

/* =========================================================
   CARREGAMENTO
========================================================= */

async function loadResource(resource) {
  const resolvedUrl = await findExistingImage(resource.baseNames);

  if (resolvedUrl) {
    imageCache.set(resource.id, resolvedUrl);
    return;
  }

  missingFiles += 1;
  imageCache.set(resource.id, createFallback(resource));
}

async function preloadResources() {
  let completed = 0;

  $("startButton").disabled = true;

  for (const resource of RESOURCES) {
    $("loadingMessage").textContent = resource.isCover
      ? "Procurando a imagem capa..."
      : `Preparando ${resource.id}...`;

    await loadResource(resource);

    completed += 1;

    const percent = Math.round((completed / RESOURCES.length) * 100);

    $("loadingPercent").textContent = `${percent}%`;
    $("loadingBar").style.width = `${percent}%`;
    $("loadingCounter").textContent =
      `${completed} de ${RESOURCES.length} recursos preparados`;

    $("loadingTrack").setAttribute("aria-valuenow", String(completed));
  }

  resourcesReady = true;

  $("loadingMessage").textContent = missingFiles
    ? "Prévia pronta com imagens provisórias."
    : "Todas as imagens estão prontas.";

  $("loadingCounter").textContent = missingFiles
    ? "Mantenha capa e img01 até img20 junto dos códigos."
    : "A aventura está pronta para começar.";

  refreshPreview(false);

  $("startButton").disabled = false;
}

/* =========================================================
   AUXILIARES
========================================================= */

function shuffle(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] =
      [result[randomIndex], result[index]];
  }

  return result;
}

function createImage(id, alt = "") {
  const image = document.createElement("img");
  image.src = imageCache.get(id) || "";
  image.alt = alt;
  image.draggable = false;
  image.loading = "eager";
  return image;
}

function formatTime(total) {
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function announce(message) {
  $("liveRegion").textContent = message;
}

function schedule(callback, delay) {
  const session = gameSessionId;

  const timeoutId = setTimeout(() => {
    scheduledTimeouts.delete(timeoutId);

    if (session === gameSessionId) {
      callback();
    }
  }, delay);

  scheduledTimeouts.add(timeoutId);
}

function clearScheduled() {
  scheduledTimeouts.forEach(clearTimeout);
  scheduledTimeouts.clear();
}

/* =========================================================
   ESTRELAS EM MOVIMENTO
========================================================= */

function createStars() {
  const starField = $("starField");
  const amount = window.innerWidth <= 600 ? 34 : 64;

  const fragment = document.createDocumentFragment();

  for (let index = 0; index < amount; index += 1) {
    const star = document.createElement("span");
    star.className = "star";

    star.style.setProperty("--left", `${Math.random() * 100}%`);
    star.style.setProperty("--size", `${5 + Math.random() * 13}px`);
    star.style.setProperty("--opacity", `${0.25 + Math.random() * 0.75}`);
    star.style.setProperty("--duration", `${10 + Math.random() * 18}s`);
    star.style.setProperty("--twinkle", `${1.8 + Math.random() * 2.6}s`);
    star.style.setProperty("--delay", `${-Math.random() * 20}s`);

    fragment.appendChild(star);
  }

  starField.appendChild(fragment);
}

/* =========================================================
   PRÉVIA DAS 3 CARTAS
========================================================= */

function refreshPreview(animate = true) {
  if (!resourcesReady) return;

  const representativeCards = PAIR_DATA.map((item) => ({
    id: item.first,
    alt: `Prévia do par ${String(item.pair).padStart(2, "0")}`
  }));

  let choices = representativeCards.filter(
    (card) => !previousPreviewIds.includes(card.id)
  );

  if (choices.length < 3) {
    choices = representativeCards;
  }

  const selected = shuffle(choices).slice(0, 3);

  previousPreviewIds = selected.map((card) => card.id);

  const applyPreview = () => {
    selected.forEach((card, index) => {
      previewImages[index].src = imageCache.get(card.id) || "";
      previewImages[index].alt = card.alt;
    });

    $("previewStack").classList.remove("is-changing");
  };

  if (animate) {
    $("previewStack").classList.add("is-changing");
    setTimeout(applyPreview, 220);
  } else {
    applyPreview();
  }
}

/* =========================================================
   NAVEGAÇÃO DE TELAS
========================================================= */

function showScreen(target) {
  const screens = [startScreen, gameScreen];

  screens.forEach((screen) => {
    const active = screen === target;
    screen.hidden = !active;
    screen.setAttribute("aria-hidden", active ? "false" : "true");
    screen.classList.remove("is-visible");
  });

  if (target === gameScreen) {
    requestAnimationFrame(() => {
      gameScreen.classList.add("is-visible");
    });
  }
}

function openGame() {
  if (!resourcesReady) return;

  resetGame();
  createBoard();
  showScreen(gameScreen);

  window.scrollTo({
    top: 0,
    behavior: "auto"
  });
}

function restartGame() {
  resetGame();
  createBoard();
  showScreen(gameScreen);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function returnHome() {
  resetGame();
  showScreen(startScreen);
  refreshPreview(true);

  window.scrollTo({
    top: 0,
    behavior: "auto"
  });
}

/* =========================================================
   TABULEIRO
========================================================= */

function createBoard() {
  const grid = $("memoryGrid");
  const fragment = document.createDocumentFragment();

  grid.innerHTML = "";

  shuffle(CARDS).forEach((data, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-card";
    button.dataset.id = data.id;
    button.dataset.pair = String(data.pair);
    button.dataset.label = data.label;
    button.dataset.position = String(index + 1);

    button.setAttribute("aria-label", `Carta ${index + 1}, fechada`);

    const inner = document.createElement("span");
    inner.className = "memory-card-inner";

    const back = document.createElement("span");
    back.className = "memory-card-face memory-card-back";
    back.appendChild(createImage(CARD_BACK_ID, "Face fechada da carta"));

    const front = document.createElement("span");
    front.className = "memory-card-face memory-card-front";
    front.appendChild(createImage(data.id, data.alt));

    inner.append(back, front);
    button.appendChild(inner);

    button.addEventListener("click", () => {
      flipCard(button);
    });

    fragment.appendChild(button);
  });

  grid.appendChild(fragment);
}

/* =========================================================
   LÓGICA DAS CARTAS
========================================================= */

function flipCard(card) {
  if (
    boardLocked ||
    card.classList.contains("is-flipped") ||
    card.classList.contains("is-matched")
  ) {
    return;
  }

  startTimer();

  card.classList.add("is-flipped");
  card.setAttribute("aria-label", `Carta aberta: ${card.dataset.label}`);

  if (!firstCard) {
    firstCard = card;
    $("instruction").textContent = "Agora escolha a segunda carta.";
    announce(`Primeira carta aberta: ${card.dataset.label}.`);
    return;
  }

  secondCard = card;
  moves += 1;
  updateStatus();

  if (firstCard.dataset.pair === secondCard.dataset.pair) {
    registerMatch();
  } else {
    registerMismatch();
  }
}

function registerMatch() {
  boardLocked = true;

  [firstCard, secondCard].forEach((card) => {
    card.classList.add("is-matched");
    card.disabled = true;
  });

  matchedPairs += 1;
  updateStatus();

  const label = firstCard.dataset.label;

  $("instruction").textContent = `Par encontrado: ${label}.`;
  announce(`Par encontrado: ${label}.`);

  schedule(() => {
    firstCard = null;
    secondCard = null;
    boardLocked = false;

    if (matchedPairs === TOTAL_PAIRS) {
      finishGame();
    }
  }, 620);
}

function registerMismatch() {
  boardLocked = true;

  const cards = [firstCard, secondCard];

  cards.forEach((card) => {
    card.classList.add("is-wrong");
  });

  $("instruction").textContent =
    "As imagens são diferentes. Tente novamente.";
  announce("As cartas não formam um par.");

  schedule(() => {
    cards.forEach((card) => {
      card.classList.remove("is-flipped", "is-wrong");
      card.setAttribute(
        "aria-label",
        `Carta ${card.dataset.position}, fechada`
      );
    });

    firstCard = null;
    secondCard = null;
    boardLocked = false;

    $("instruction").textContent = "Escolha duas novas cartas.";
  }, 1000);
}

/* =========================================================
   CRONÔMETRO
========================================================= */

function startTimer() {
  if (timerId !== null) return;

  timerId = setInterval(() => {
    elapsedSeconds += 1;
    $("timer").textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
  }
  timerId = null;
}

/* =========================================================
   STATUS
========================================================= */

function updateStatus() {
  $("movesCounter").textContent = String(moves);
  $("pairsCounter").textContent = String(matchedPairs);

  $("progressBar").style.width =
    `${(matchedPairs / TOTAL_PAIRS) * 100}%`;

  $("progressTrack").setAttribute(
    "aria-valuenow",
    String(matchedPairs)
  );
}

function resetGame() {
  clearScheduled();
  gameSessionId += 1;
  stopTimer();

  firstCard = null;
  secondCard = null;
  boardLocked = false;

  moves = 0;
  matchedPairs = 0;
  elapsedSeconds = 0;

  $("movesCounter").textContent = "0";
  $("timer").textContent = "00:00";
  $("pairsCounter").textContent = "0";
  $("progressBar").style.width = "0%";
  $("progressTrack").setAttribute("aria-valuenow", "0");

  $("instruction").textContent =
    "Abra duas cartas e encontre duas imagens iguais.";

  $("finishPanel").hidden = true;
}

/* =========================================================
   CONCLUSÃO
========================================================= */

function finishGame() {
  stopTimer();

  $("instruction").textContent =
    "Parabéns! Você encontrou todos os pares.";

  $("finishSummary").textContent =
    `Você completou o desafio em ${moves} jogadas e ${formatTime(elapsedSeconds)}.`;

  $("finishPanel").hidden = false;

  announce("Parabéns! Você encontrou todos os dez pares.");

  schedule(() => {
    $("finishPanel").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }, 320);
}

/* =========================================================
   EVENTOS
========================================================= */

$("startButton").addEventListener("click", openGame);
$("restartButton").addEventListener("click", restartGame);
$("homeButton").addEventListener("click", returnHome);
$("playAgainButton").addEventListener("click", restartGame);
$("finishHomeButton").addEventListener("click", returnHome);

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

createStars();
preloadResources();