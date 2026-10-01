// Starting Data
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" }
];

// 1. searchNotes(word)
function searchNotes(word) {
  const searchTerm = word.toLowerCase();
  return notes.filter(note => note.text.toLowerCase().includes(searchTerm));
}

// Testing searchNotes
console.log("--- Testing searchNotes ---");
console.log(searchNotes("javascript")); // Expected: [{ id: 4, text: "Revise JavaScript arrays", category: "study" }]
console.log(searchNotes("nonexistent")); // Expected: []

// 2. longestNote()
function longestNote() {
  if (notes.length === 0) return null;
  return notes.reduce((longest, current) => 
    current.text.length > longest.text.length ? current : longest
  );
}

// Testing longestNote
console.log("--- Testing longestNote ---");
console.log(longestNote()); // Expected: Note #3 ("Email the project report to Grace")

// 3. countByCategory()
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

// Testing countByCategory
console.log("--- Testing countByCategory ---");
console.log(countByCategory()); // Expected: { personal: 2, study: 2, work: 1 }

// 4. getSummary()
function getSummary() {
  const totalNotes = notes.length;
  const categories = countByCategory();
  
  let summary = `Total notes: ${totalNotes}\nBy category:\n`;
  for (const [category, count] of Object.entries(categories)) {
    summary += `- ${category}: ${count}\n`;
  }
  
  return summary.trim();
}

// Testing getSummary
console.log("--- Testing getSummary ---");
console.log(getSummary());

// 5. isDuplicate(text)
function isDuplicate(text) {
  const targetText = text.trim().toLowerCase();
  return notes.some(note => note.text.toLowerCase() === targetText);
}

// Testing isDuplicate
console.log("--- Testing isDuplicate ---");
console.log(isDuplicate("Buy milk and bread")); // Expected: true
console.log(isDuplicate("  buy milk and BREAD  ")); // Expected: true (handles spaces and case)
console.log(isDuplicate("Unique new note")); // Expected: false

// 6. addNote(text, category)
function addNote(text, category) {
  if (isDuplicate(text)) {
    console.log(`Cannot add duplicate note: "${text}"`);
    return false;
  }

  const newId = notes.length > 0 ? Math.max(...notes.map(note => note.id)) + 1 : 1;
  const newNote = {
    id: newId,
    text: text.trim(),
    category: category.trim().toLowerCase()
  };

  notes.push(newNote);
  return newNote;
}

// Testing addNote
console.log("--- Testing addNote ---");
console.log(addNote("Buy milk and bread", "personal")); // Expected: false (duplicate)
console.log(addNote("Learn Async JavaScript", "study")); // Expected: New note object with id: 6
console.log(notes); // Verify array length increased to 6