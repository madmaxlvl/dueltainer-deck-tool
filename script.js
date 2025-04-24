function importDeck() {
  const input = document.getElementById("deckURL").value;
  const deckIdMatch = input.match(/id=(\d+)/);

  if (deckIdMatch) {
    const deckId = deckIdMatch[1];
    alert("DuelingBook deck detected! Deck ID: " + deckId);
    // In Step 3: Fetch and parse actual deck
  } else {
    alert("Please enter a valid DuelingBook deck link (with id=)");
  }
}

function checkLegality() {
  alert("Legality checking coming soon!");
}
