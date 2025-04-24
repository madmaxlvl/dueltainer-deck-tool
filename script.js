const cardCache = {};
const ygoproApi = "https://db.ygoprodeck.com/api/v7/cardinfo.php?";

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

  try {
    const res = await fetch(`https://www.duelingbook.com/php-scripts/load-deck.php?deck=${deckId}`);
    const rawText = await res.text();

    console.log("🧾 Raw Response from DuelingBook:", rawText);

    let deck;
    try {
      deck = JSON.parse(rawText);
    } catch (e) {
      console.error("❌ Failed to parse JSON. Deck may be private or broken.", e);
      alert("This deck could not be read — it may be private or invalid.");
      return;
    }

    if (!deck || !deck.main || !Array.isArray(deck.main)) {
      console.warn("❗ Deck is missing or malformed:", deck);
      alert("❌ This deck appears to be empty, private, or malformed.");
      return;
    }

    console.log("✅ Parsed Deck:", deck);
    window.currentDeck = deck;
    await renderDeck(deck);

  } catch (err) {
    console.error("❌ Error fetching deck from DuelingBook:", err);
    alert("Network error — check your connection or try again later.");
  }
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
    console.warn("Unknown Card ID:", passcode);
    return li;
  }

  li.innerHTML = `
    <img src="${card.card_images[0].image_url_small}" alt="${card.name}" title="${card.name}" style="height:90px;"><br>
    ${card.name}
  `;
  return li;
}

async function fetchCardData(passcode) {
  if (cardCache[passcode]) return cardCache[passcode];

  try {
    const res = await fetch(`${ygoproApi}id=${passcode}`);
    const data = await res.json();
    if (!data.data || !data.data.length) {
      console.warn("No YGOPro match for:", passcode);
      return null;
    }

    const card = data.data[0];
    cardCache[passcode] = card;
    return card;
  } catch (err) {
    console.error("Error fetching card", passcode, err);
    return null;
  }
}

function checkLegality() {
  alert("Legality logic will be upgraded in Step 4B!");
}
