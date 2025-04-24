// =========================
// FULL FIXED script.js FILE (Safe for all DOM states + handleFileUpload)
// =========================

const cardCache = {};
const ygoproApi = "https://db.ygoprodeck.com/api/v7/cardinfo.php?";

const $ = id => document.getElementById(id);

let mainDeckCards = [];
let extraDeckCards = [];

// =============================
// Load Card by Passcode (API)
// =============================
async function loadCardById(id) {
  const numericId = parseInt(id, 10);
  if (cardCache[numericId]) return cardCache[numericId];

  try {
    const res = await fetch(`${ygoproApi}id=${numericId}`);
    const data = await res.json();
    if (!data.data || !data.data.length) return null;

    const card = data.data[0];
    card.image_url = card.card_images?.[0]?.image_url || "";
    cardCache[numericId] = card;
    return card;
  } catch (err) {
    console.error("Failed to fetch", id, err);
    return null;
  }
}

// ==========================
// .ydk File Import Handling
// ==========================
function handleDeckFileImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/,\s*/g, "\n")
      .split("\n");

    const deck = { main: [], extra: [] };
    let section = "main";

    for (const raw of lines) {
      const line = raw.trim();
      const normalized = line.toLowerCase();

      if (!line || line.startsWith("#") || line.startsWith("!")) {
        if (normalized.includes("main")) section = "main";
        else if (normalized.includes("extra")) section = "extra";
        else if (normalized.includes("side")) section = "side";
        continue;
      }

      if (section !== "side" && /^\d+$/.test(line)) {
        deck[section].push(line);
      }
    }

    console.log("Parsed .ydk deck:", deck);
    renderDeck(deck);
    const nameBox = $("deck-name-input");
    if (nameBox) nameBox.value = file.name.replace(/\.ydk$/i, "");
    showFeedback("Deck imported.", true);
  };

  reader.onerror = () => showFeedback("Failed to import .ydk file.", false);
  reader.readAsText(file);
}

// ✅ Alias for backward compatibility with older onclick="handleFileUpload()" HTML
function handleFileUpload() {
  const input = $("import-file-input");
  if (input) input.click();
}

// ==========================
// Render Deck to Grid UI
// ==========================
function renderDeck(deck) {
  mainDeckCards = [];
  extraDeckCards = [];

  Promise.all(deck.main.map(loadCardById)).then(mainCards => {
    mainDeckCards = mainCards.filter(Boolean);
    Promise.all(deck.extra.map(loadCardById)).then(extraCards => {
      extraDeckCards = extraCards.filter(Boolean);
      updateDeckZonesUI();
    });
  });
}

// ==========================
// Update Main/Extra UI
// ==========================
function updateDeckZonesUI() {
  const mainList = $("main-deck-list");
  const extraList = $("extra-deck-list");
  if (!mainList || !extraList) return;

  mainList.innerHTML = "";
  extraList.innerHTML = "";

  [...mainDeckCards, ...extraDeckCards].forEach(card => {
    const div = document.createElement("div");
    div.className = "deck-card";
    div.innerHTML = `<img src="${card.image_url}" alt="${card.name}">`;
    (card.type.toLowerCase().includes("fusion") || card.type.toLowerCase().includes("synchro"))
      ? extraList.appendChild(div)
      : mainList.appendChild(div);
  });
}

// ==========================
// Feedback Helper
// ==========================
function showFeedback(message, success = true) {
  const el = $("deck-manager-feedback");
  if (!el) return;
  el.textContent = message;
  el.className = success ? "dm-success" : "dm-error";
}

// ==========================
// Event Listeners (Safe)
// ==========================
window.addEventListener("DOMContentLoaded", () => {
  const importBtn = $("import-deck-btn");
  const inputFile = $("import-file-input");

  if (importBtn && inputFile) {
    importBtn.addEventListener("click", () => inputFile.click());
    inputFile.addEventListener("change", function () {
      const file = this.files[0];
      if (!file || !file.name.toLowerCase().endsWith(".ydk")) {
        showFeedback("Please select a valid .ydk file.", false);
        return;
      }
      handleDeckFileImport(file);
      this.value = "";
    });
  }
});
