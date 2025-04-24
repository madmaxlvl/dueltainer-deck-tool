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
    const text = await res.text();

    // Try to parse JSON manually
    let deck;
    try {
      deck = JSON.parse(text);
    } catch {
      console.error("Failed to parse deck as JSON:", text);
      alert("This deck may be private or invalid.");
      return;
    }

    if (!deck || !Array.isArray(deck.main)) {
      alert("This deck is empty, invalid, or not public.");
      console.error("Invalid deck object:", deck);
      return;
    }

    console.log("Deck loaded:", deck);
    window.currentDeck = deck;
    await renderDeck(deck);
  } catch (err) {
    console.error("Error importing deck:", err);
    alert("Something went wrong while loading the deck.");
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
