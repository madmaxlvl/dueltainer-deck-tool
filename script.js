// === Simulated Tier Lists (Replace with live Sheets in Step 4) ===
const BANNED = ["Pot of Greed", "Raigeki", "Monster Reborn"];
const ATIER = ["Ash Blossom & Joyous Spring", "Maxx C"];
const BTIER = ["Called by the Grave", "Foolish Burial", "Twin Twisters"];
const EXEMPT = ["Celtic Guardian", "Blue-Eyes White Dragon"];

function extractDeckId(url) {
  const match = url.match(/id=(\d+)/);
  return match ? match[1] : null;
}

async function importDeck() {
  const input = document.getElementById("deckURL").value;
  const deckId = extractDeckId(input);

  if (!deckId) {
    alert("Please enter a valid DuelingBook deck link");
    return;
  }

  const res = await fetch(`https://www.duelingbook.com/php-scripts/load-deck.php?deck=${deckId}`);
  if (!res.ok) return alert("Failed to fetch deck.");

  const deck = await res.json();
  renderDeck(deck);
  window.currentDeck = deck;
}

function renderDeck(deck) {
  const mainUL = document.getElementById("main-deck");
  const extraUL = document.getElementById("extra-deck");

  mainUL.innerHTML = "";
  extraUL.innerHTML = "";

  for (const id of deck.main) {
    const li = document.createElement("li");
    li.textContent = id;
    mainUL.appendChild(li);
  }

  for (const id of deck.extra) {
    const li = document.createElement("li");
    li.textContent = id;
    extraUL.appendChild(li);
  }
}

async function checkLegality() {
  const deck = window.currentDeck;
  if (!deck) return alert("Import a deck first!");

  const main = deck.main || [];
  const extra = deck.extra || [];
  const all = [...main, ...extra];

  const cardCounts = {};
  const illegal = {
    banned: [],
    atier: [],
    btier: [],
    duplicates: []
  };

  for (const id of all) {
    cardCounts[id] = (cardCounts[id] || 0) + 1;
  }

  let aCount = 0;
  let bCount = 0;

  for (const [id, count] of Object.entries(cardCounts)) {
    const name = id; // TEMP: using ID as fake name
    const isExempt = EXEMPT.includes(name);
    const isNormal = false;

    if (BANNED.includes(name)) illegal.banned.push(name);
    if (ATIER.includes(name)) { aCount++; if (aCount > 3) illegal.atier.push(name); }
    if (BTIER.includes(name)) { bCount++; if (bCount > 5) illegal.btier.push(name); }
    if (count > 1 && !isExempt && !isNormal) illegal.duplicates.push(`${name} x${count}`);
  }

  const output = [];

  if (illegal.banned.length) output.push("🚫 Banned Cards: " + illegal.banned.join(", "));
  if (illegal.atier.length) output.push("⚠️ A Tier Overlimit: " + illegal.atier.join(", "));
  if (illegal.btier.length) output.push("⚠️ B Tier Overlimit: " + illegal.btier.join(", "));
  if (illegal.duplicates.length) output.push("❗ Duplicate Cards: " + illegal.duplicates.join(", "));

  const resultBox = document.getElementById("result");
  resultBox.innerHTML = output.length === 0
    ? "<span style='color:lime'>✅ Deck is LEGAL!</span>"
    : "<span style='color:red'>❌ Deck is ILLEGAL:</span><br>" + output.join("<br>");
}
