// =========================
// FULL FEATURED script.js FOR DECK TOOL with Google Sheets Sync
// =========================

const cardCache = {};
const ygoproApi = "https://db.ygoprodeck.com/api/v7/cardinfo.php?";
const $ = id => document.getElementById(id);
let mainDeckCards = [];
let extraDeckCards = [];

let BANNED = [];
let ATIER = [];
let BTIER = [];
let EXEMPT = [];

// =========================
// Google Sheets Config
// =========================
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID = '1qnuGCGG5NM80m6PRSxwutvvczbs2rgovODMsz84QVAI'; // 🔁 Replace with your Google Sheet ID
const API_KEY = 'AIzaSyBetmTaErhwDcwkoj672dy15p_xB8P7ENE';   // 🔁 Replace with your Google Sheets API Key
const RANGE_MAP = {
  BANNED: 'BANNED!A:A',
  ATIER: 'ATIER!A:A',
  BTIER: 'BTIER!A:A',
  EXEMPT: 'EXEMPT!A:A'
};

async function fetchList(sheetRange) {
  const url = `${SHEETS_BASE}/${SHEET_ID}/values/${sheetRange}?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    return json.values?.flat().filter(v => v) || [];
  } catch (e) {
    console.error(`Error fetching ${sheetRange}:`, e);
    return [];
  }
}

async function loadAllLists() {
  [BANNED, ATIER, BTIER, EXEMPT] = await Promise.all([
    fetchList(RANGE_MAP.BANNED),
    fetchList(RANGE_MAP.ATIER),
    fetchList(RANGE_MAP.BTIER),
    fetchList(RANGE_MAP.EXEMPT)
  ]);
  showFeedback("Tier lists loaded from Google Sheets.", true);
}

function showFeedback(msg, success = true) {
  const el = $("deck-manager-feedback");
  if (!el) return;
  el.textContent = msg;
  el.className = success ? "dm-success" : "dm-error";
}

async function loadCardById(id) {
  const numericId = parseInt(id, 10);
  if (cardCache[numericId]) return cardCache[numericId];
  try {
    const res = await fetch(`${ygoproApi}id=${numericId}`);
    const data = await res.json();
    const card = data.data?.[0] || null;
    if (card) {
      card.image_url = card.card_images?.[0]?.image_url || "";
      cardCache[numericId] = card;
    }
    return card;
  } catch (err) {
    console.error("Fetch error:", id, err);
    return null;
  }
}

function handleFileUpload() {
  $("import-file-input").click();
}

function handleDeckFileImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split(/\r?\n/);
    const deck = { main: [], extra: [] };
    let section = "main";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) {
        if (trimmed.toLowerCase().includes("main")) section = "main";
        if (trimmed.toLowerCase().includes("extra")) section = "extra";
        continue;
      }
      if (/^\d+$/.test(trimmed)) deck[section].push(trimmed);
    }
    renderDeck(deck);
    $("deck-name-input").value = file.name.replace(/\.ydk$/i, "");
    showFeedback("Deck imported successfully.", true);
  };
  reader.onerror = () => showFeedback("File read error.", false);
  reader.readAsText(file);
}

function renderDeck(deck) {
  mainDeckCards = [];
  extraDeckCards = [];
  Promise.all(deck.main.map(loadCardById)).then(main => {
    mainDeckCards = main.filter(Boolean);
    Promise.all(deck.extra.map(loadCardById)).then(extra => {
      extraDeckCards = extra.filter(Boolean);
      updateDeckZonesUI();
      checkLegality();
    });
  });
}

function getCardBadge(name) {
  if (BANNED.includes(name)) return "🚫 Banned";
  if (ATIER.includes(name)) return "⭐ A-Tier";
  if (BTIER.includes(name)) return "🔹 B-Tier";
  return "";
}

function updateDeckZonesUI() {
  const mainList = $("main-deck-list");
  const extraList = $("extra-deck-list");
  mainList.innerHTML = "";
  extraList.innerHTML = "";

  mainDeckCards.forEach(card => {
    const div = document.createElement("div");
    div.className = "deck-card";
    div.innerHTML = `<img src="${card.image_url}" alt="${card.name}"><div>${getCardBadge(card.name)}</div>`;
    mainList.appendChild(div);
  });
  extraDeckCards.forEach(card => {
    const div = document.createElement("div");
    div.className = "deck-card";
    div.innerHTML = `<img src="${card.image_url}" alt="${card.name}"><div>${getCardBadge(card.name)}</div>`;
    extraList.appendChild(div);
  });
}

function exportDeck() {
  const name = $("deck-name-input").value.trim() || "my_deck";
  const safeName = name.replace(/[^a-z0-9_-]/gi, "_");
  const main = mainDeckCards.map(c => c.id);
  const extra = extraDeckCards.map(c => c.id);
  const text = ["#main", ...main, "#extra", ...extra, "!side"].join("\r\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.ydk`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showFeedback(`Exported deck as ${safeName}.ydk`, true);
}

function checkLegality() {
  const countMap = {};
  const allCards = [...mainDeckCards, ...extraDeckCards];
  let aCount = 0, bCount = 0;
  let banned = [];

  allCards.forEach(card => {
    const name = card.name;
    countMap[name] = (countMap[name] || 0) + 1;
    if (BANNED.includes(name)) banned.push(name);
    if (ATIER.includes(name)) aCount++;
    if (BTIER.includes(name)) bCount++;
  });

  const issues = [];
  if (mainDeckCards.length < 40 || mainDeckCards.length > 60)
    issues.push(`Main Deck must be 40-60 cards. Currently ${mainDeckCards.length}.`);
  if (extraDeckCards.length > 15)
    issues.push(`Extra Deck cannot exceed 15 cards. Currently ${extraDeckCards.length}.`);
  if (aCount > 3) issues.push(`Too many A-Tier cards (${aCount}/3).`);
  if (bCount > 5) issues.push(`Too many B-Tier cards (${bCount}/5).`);
  if (banned.length) issues.push(`Banned cards found: ${banned.join(", ")}`);

  const dupes = Object.entries(countMap).filter(([name, count]) => count > 1 && !EXEMPT.includes(name));
  dupes.forEach(([name, count]) => issues.push(`"${name}" appears ${count} times. Limit is 1.`));

  if (issues.length) {
    showFeedback(issues.join("\n"), false);
  } else {
    showFeedback("Deck is legal!", true);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const importBtn = $("import-deck-btn");
  const inputFile = $("import-file-input");
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export .ydk";
  exportBtn.onclick = exportDeck;
  document.body.appendChild(exportBtn);

  importBtn?.addEventListener("click", () => inputFile?.click());
  inputFile?.addEventListener("change", function () {
    const file = this.files[0];
    if (!file || !file.name.endsWith(".ydk")) return showFeedback("Select a .ydk file.", false);
    handleDeckFileImport(file);
    this.value = "";
  });

  loadAllLists();
});
