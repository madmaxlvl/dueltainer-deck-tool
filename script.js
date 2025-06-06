// =========================
// FULLY FUNCTIONAL DECK BUILDER SCRIPT WITH GOOGLE SHEETS, TIER RULES, TOOLTIP, AND SINGLETON CHECK
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

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID = '1qnuGCGG5NM80m6PRSxwutvvczbs2rgovODMsz84QVAI';
const API_KEY = 'AIzaSyBetmTaErhwDcwkoj672dy15p_xB8P7ENE';
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
  el.innerHTML = msg;
  el.className = success ? "dm-success" : "dm-error";
}

function getCardTier(card) {
  const name = card.name;
  if (BANNED.includes(name)) return 0;
  if (ATIER.includes(name)) return 1;
  if (BTIER.includes(name)) return 2;
  return 3;
}

function getCardTypeValue(type) {
  const map = {
    monster: 1, spell: 2, trap: 3, fusion: 4, synchro: 5, ritual: 6
  };
  const t = type.toLowerCase();
  if (t.includes("fusion")) return map.fusion;
  if (t.includes("synchro")) return map.synchro;
  if (t.includes("ritual")) return map.ritual;
  if (t.includes("spell")) return map.spell;
  if (t.includes("trap")) return map.trap;
  return map.monster;
}

function sortDeck() {
  const sorter = (a, b) => {
    const tierDiff = getCardTier(a) - getCardTier(b);
    if (tierDiff !== 0) return tierDiff;
    const typeDiff = getCardTypeValue(a.type) - getCardTypeValue(b.type);
    if (typeDiff !== 0) return typeDiff;
    return a.name.localeCompare(b.name);
  };
  mainDeckCards.sort(sorter);
  extraDeckCards.sort(sorter);
  updateDeckZonesUI();
  showFeedback("Deck sorted with tier, type, and name priority.", true);
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

function getCardBadge(name) {
  if (BANNED.includes(name)) return "<span class='badge banned' title='Banned Card'>🚫 BANNED</span>";
  if (ATIER.includes(name)) return "<span class='badge a-tier' title='A Tier Card'>⭐ A-TIER</span>";
  if (BTIER.includes(name)) return "<span class='badge b-tier' title='B Tier Card'>🔹 B-TIER</span>";
  return "";
}

function showTooltip(event, card) {
  let tooltip = document.getElementById("tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "tooltip";
    tooltip.style.position = "absolute";
    tooltip.style.background = "#222";
    tooltip.style.border = "1px solid #ccc";
    tooltip.style.color = "#fff";
    tooltip.style.padding = "8px";
    tooltip.style.zIndex = "999";
    tooltip.style.borderRadius = "8px";
    tooltip.style.maxWidth = "200px";
    document.body.appendChild(tooltip);
  }
  tooltip.innerHTML = `<strong>${card.name}</strong><br><img src='${card.image_url}' style='width:100%;'><br>${card.desc}<br><div style='margin-top:5px; font-weight:bold;'>Tier: ${getCardBadge(card.name)}</div>`;
  tooltip.style.left = event.pageX + 15 + "px";
  tooltip.style.top = event.pageY + 15 + "px";
  tooltip.style.display = "block";
}

function hideTooltip() {
  const tooltip = document.getElementById("tooltip");
  if (tooltip) tooltip.style.display = "none";
}

function updateDeckZonesUI() {
  const tierCounts = { 0: 0, 1: 0, 2: 0 };
  mainDeckCards.concat(extraDeckCards).forEach(c => { const t = getCardTier(c); if (t < 3) tierCounts[t]++; });
  const legend = document.getElementById('deck-legend');
  if (legend) {
    legend.innerHTML = `<strong>Legend:</strong>
      <div><span class='badge banned'>🚫</span> BANNED (${tierCounts[0]})</div>
      <div><span class='badge a-tier'>⭐</span> A-TIER (${tierCounts[1]})</div>
      <div><span class='badge b-tier'>🔹</span> B-TIER (${tierCounts[2]})</div>`;
  }

  const mainList = $("main-deck-list");
  const extraList = $("extra-deck-list");
  mainList.innerHTML = "";
  extraList.innerHTML = "";

  [...mainDeckCards, ...extraDeckCards].forEach(card => {
    const div = document.createElement("div");
    div.className = `deck-card tier-${getCardTier(card)}`;
    div.innerHTML = `<div style='position:relative;'>
  <img src="${card.image_url}" alt="${card.name}" 
       onmouseenter='showTooltip(event, ${JSON.stringify(card).replace(/'/g, "&apos;")})' 
       onmouseleave='hideTooltip()'>
  <div style='position:absolute; top:2px; right:2px; font-size:10px; font-weight:bold; background:red; color:white; padding:2px 6px; border-radius:4px;'>${getCardBadge(card.name)}</div>
</div>`;
    (mainDeckCards.includes(card) ? mainList : extraList).appendChild(div);
  });
}

function isSingletonExempt(card) {
  const name = card.name.toLowerCase();
  const type = card.type?.toLowerCase() || "";
  return (
    EXEMPT.map(n => n.toLowerCase()).includes(name) ||
    (type.includes("normal") && type.includes("monster")) ||
    (type.includes("ritual") && !type.includes("effect")) ||
    (type.includes("fusion") && !type.includes("effect")) ||
    (type.includes("synchro") && !type.includes("effect"))
  );
}

function checkSingletonViolations(deckCards) {
  const countMap = {};
  const violations = [];
  deckCards.forEach(card => {
    const name = card.name.toLowerCase();
    countMap[name] = (countMap[name] || 0) + 1;
  });
  for (const [name, count] of Object.entries(countMap)) {
    const card = deckCards.find(c => c.name.toLowerCase() === name);
    if (count > 1 && !isSingletonExempt(card)) {
      violations.push(`"${card.name}" appears ${count} times (limit 1).`);
    }
  }
  return violations;
}

function checkLegality() {
  const allCards = [...mainDeckCards, ...extraDeckCards];
  const banned = allCards.filter(card => BANNED.includes(card.name));
  const aCount = allCards.filter(card => ATIER.includes(card.name)).length;
  const bCount = allCards.filter(card => BTIER.includes(card.name)).length;

  const messages = [];
  if (mainDeckCards.length < 40 || mainDeckCards.length > 60)
    messages.push(`Main Deck must be 40–60 cards. You have ${mainDeckCards.length}.`);
  if (extraDeckCards.length > 15)
    messages.push(`Extra Deck cannot exceed 15 cards. You have ${extraDeckCards.length}.`);
  if (aCount > 3) messages.push(`Too many A-Tier cards: ${aCount} (limit is 3).`);
  if (bCount > 5) messages.push(`Too many B-Tier cards: ${bCount} (limit is 5).`);
  if (banned.length)
    messages.push(`Banned cards found: ${banned.map(c => c.name).join(", ")}`);
  const singletonIssues = checkSingletonViolations(allCards);
  if (singletonIssues.length) messages.push(...singletonIssues);

  if (messages.length === 0) {
    showFeedback("✅ Deck is legal!", true);
  } else {
    showFeedback(messages.join("<br>"), false);
  }
}

function handleDeckFileImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const lines = reader.result.split(/\r?\n|\n|\r/);
    const deckData = { main: [], extra: [] };
    let section = "main";
    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith("#") || line.startsWith("!")) {
        const l = line.toLowerCase();
        if (l.includes("#main")) section = "main";
        else if (l.includes("#extra") || l.includes("!extra")) section = "extra";
        else if (l.includes("#side") || l.includes("!side")) section = "side";
        return;
      }
      if (section !== "side" && line) deckData[section].push(line);
    });
    renderDeck(deckData);
    showFeedback("Deck imported successfully!", true);
  };
  reader.onerror = () => {
    showFeedback("Failed to read deck file.", false);
  };
  reader.readAsText(file);
}

function renderDeck(deck) {
  mainDeckCards = [];
  extraDeckCards = [];
  Promise.all(deck.main.map(id => loadCardById(id))).then(results => {
    mainDeckCards = results.filter(card => card);
    Promise.all(deck.extra.map(id => loadCardById(id))).then(results2 => {
      extraDeckCards = results2.filter(card => card);
      updateDeckZonesUI();
    });
  });
}

function setupSearchBar() {
  const input = document.createElement("input");
  input.type = "text";
  input.id = "card-search-input";
  input.placeholder = "Search cards...";
  input.style.padding = "6px";
  input.style.margin = "10px 0";
  input.style.width = "300px";

  const button = document.createElement("button");
  button.innerText = "Search";
  button.onclick = () => searchCards(input.value);

  document.body.insertBefore(input, document.getElementById("deck-manager-feedback"));
  document.body.insertBefore(button, document.getElementById("deck-manager-feedback"));
}

async function searchCards(query) {
  if (!query.trim()) return;
  const oldResults = document.getElementById("search-results-container");
  if (oldResults) oldResults.remove();

  try {
    const res = await fetch(`${ygoproApi}fname=${encodeURIComponent(query.trim())}&num=30&misc=yes&type=&level=&attribute=&race=&archetype=`);
    const data = await res.json();

    const container = document.createElement("div");
    container.id = "search-results-container";
    container.style.display = "grid";
    container.style.gridTemplateColumns = "repeat(auto-fill, minmax(150px, 1fr))";
    container.style.gap = "10px";
    container.style.padding = "10px";
    container.style.background = "#141414";
    container.style.border = "1px solid #2c2c2c";
    container.style.borderRadius = "12px";
    container.style.marginTop = "10px";
    container.style.maxHeight = "60vh";
    container.style.overflowY = "auto";

    document.getElementById("deckbuilder-container").appendChild(container);

    if (data.data?.length) {
      showFeedback(`Found ${data.data.length} result(s). Click a card to add.`);
      data.data.forEach(card => {
        card.image_url = card.card_images?.[0]?.image_url || "";
        cardCache[card.id] = card;
        const div = document.createElement("div");
        div.style.border = "1px solid #333";
        div.style.borderRadius = "8px";
        div.style.background = "#1a1a1a";
        div.style.padding = "5px";
        div.style.cursor = "pointer";
        div.innerHTML = `<img src="${card.image_url}" alt="${card.name}" style="width:100%;border-radius:4px"><div style="text-align:center;font-size:0.9em;margin-top:4px">${card.name}</div>`;
        div.onclick = () => {
          const zone = getCardTier(card) <= 2 || card.type.includes("Fusion") || card.type.includes("Synchro") ? extraDeckCards : mainDeckCards;
          zone.push(card);
          updateDeckZonesUI();
        };
        container.appendChild(div);
      });
    } else {
      showFeedback("No cards found.", false);
    }
  } catch (err) {
    console.error("Search error", err);
    showFeedback("Error searching for cards.", false);
  }
}

// =========================
// ADDITION: EXPORT YDK BUTTON
// =========================

function setupExportButton() {
  const btn = document.createElement("button");
  btn.innerText = "Export .YDK";
  btn.onclick = exportDeck;
  document.body.appendChild(btn);
}

function exportDeck() {
  const banned = [], aTier = [], bTier = [];
  const allCards = [...mainDeckCards, ...extraDeckCards];
  allCards.forEach(c => {
    const tier = getCardTier(c);
    if (tier === 0) banned.push(c.name);
    else if (tier === 1) aTier.push(c.name);
    else if (tier === 2) bTier.push(c.name);
  });
  const listSummary = [
    `BANNED (${banned.length}): ${banned.join(", ") || "None"}`,
    `A Tier (${aTier.length}): ${aTier.join(", ") || "None"}`,
    `B Tier (${bTier.length}): ${bTier.join(", ") || "None"}`
  ].join("
");

  console.log(listSummary);
  const lines = ["#main", ...mainDeckCards.map(c => c.id), "#extra", ...extraDeckCards.map(c => c.id), "!side"];
  const text = lines.join("\r\n");
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "dueltainer_deck.ydk";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showFeedback("Deck exported as .ydk
" + listSummary, true);
}

window.addEventListener("DOMContentLoaded", () => {
  // Existing buttons
  const importBtn = $("import-deck-btn");
  const inputFile = $("import-file-input");
  const legalityBtn = $("deck-check-btn");
  const sortBtn = $("sort-deck-btn");

  importBtn?.addEventListener("click", () => inputFile?.click());
  inputFile?.addEventListener("change", function () {
    const file = this.files[0];
    if (!file || !file.name.endsWith(".ydk")) return showFeedback("Select a .ydk file.", false);
    handleDeckFileImport(file);
    this.value = "";
  });
  legalityBtn?.addEventListener("click", checkLegality);
  sortBtn?.addEventListener("click", sortDeck);

  loadAllLists();
  setupSearchBar();
  setupExportButton();
});

