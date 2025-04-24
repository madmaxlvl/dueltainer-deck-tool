const cardCache = {};
const ygoproApi = "https://db.ygoprodeck.com/api/v7/cardinfo.php?";

function handleFileUpload() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) {
    alert("Please select a .ydk file to upload.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const parsed = parseYDK(text);
    if (!parsed.main.length && !parsed.extra.length) {
      alert("No cards found. Is this a valid .ydk file?");
      return;
    }
    window.currentDeck = parsed;
    renderDeck(parsed);
  };
  reader.readAsText(file);
}

function parseYDK(text) {
  const main = [];
  const extra = [];
  const side = [];

  let currentSection = null;
  const lines = text.split(/\r?\n/);

  console.log("🔍 Raw .ydk lines:", lines);

  for (let rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("#") || trimmed === "") {
      continue;
    }

    if (trimmed.toLowerCase() === "main") {
      currentSection = main;
    } else if (trimmed.toLowerCase() === "extra") {
      currentSection = extra;
    } else if (trimmed.toLowerCase() === "side") {
      currentSection = side;
    } else if (/^\d+$/.test(trimmed)) {
      currentSection?.push(Number(trimmed));
    } else {
      console.warn("⚠️ Skipping unrecognized line in .ydk:", rawLine);
    }
  }

  console.log("✅ Final Parsed Deck:", { main, extra, side });
  return { main, extra, side };
}

async function renderDeck(deck) {
  const mainUL = document.getElementById("main-deck");
  const extraUL = document.getElementById("extra-deck");
  mainUL.innerHTML = "";
  extraUL.innerHTML = "";

  for (const id of deck.main) {
    const li = await createCardElement(id);
    mainUL.appendChild(li);
  }

  for (const id of deck.extra) {
    const li = await createCardElement(id);
    extraUL.appendChild(li);
  }
}

async function createCardElement(passcode) {
  const li = document.createElement("li");

  const card = await fetchCardData(passcode);
  if (!card) {
    li.textContent = `❌ Unknown Card (${passcode})`;
    return li;
  }

  li.innerHTML = `
    <img src="${card.card_images[0].image_url_small}" alt="${card.name}" title="${card.name}" style="height:100px;"><br>
    ${card.name}
  `;
  return li;
}

async function fetchCardData(passcode) {
  if (cardCache[passcode]) return cardCache[passcode];

  try {
    const res = await fetch(`${ygoproApi}id=${passcode}`);
    const data = await res.json();
    if (!data.data || !data.data.length) return null;

    const card = data.data[0];
    cardCache[passcode] = card;
    return card;
  } catch (err) {
    console.error("Error fetching card", passcode, err);
    return null;
  }
}

function checkLegality() {
  alert("Legality logic coming next!");
}
