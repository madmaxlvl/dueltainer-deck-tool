function extractDeckId(url) {
  const match = url.match(/id=(\d+)/);
  return match ? match[1] : null;
}

async function importDeck() {
  alert("ImportDeck() was called!");
  const input = document.getElementById("deckURL").value;
  const deckId = extractDeckId(input);

  if (!deckId) {
    alert("Please enter a valid DuelingBook deck link");
    return;
  }

  const res = await fetch(`https://www.duelingbook.com/php-scripts/load-deck.php?deck=${deckId}`);
  if (!res.ok) return alert("Failed to fetch deck.");

  const deck = await res.json();
  console.log(deck); // Debug
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

function checkLegality() {
  alert("CheckLegality() was called!");
}
