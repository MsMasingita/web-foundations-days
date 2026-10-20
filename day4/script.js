// 1. Grab all elements from the DOM
const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

// 2. Define keys for localStorage so we don't misspell them later
const STORAGE_KEY_TEXT = "day4_draft";
const STORAGE_KEY_THEME = "day4_theme";

// 3. Calculate and display character count, word count, and alert classes
function updateCounts() {
  const text = noteText.value;
  const numChars = text.length;

  // Split text by spaces/line-breaks, filtering out extra blank spaces
  const wordsArray = text.trim().split(/\s+/).filter(Boolean);
  const numWords = text.trim() === "" ? 0 : wordsArray.length;

  // Update counter text exactly as instructed
  charCount.textContent = `${numChars} / 200 characters`;
  wordCount.textContent = `${numWords} words`;

  // Apply warning (over 180) and over (over 200) classes
  if (numChars > 200) {
    charCount.classList.add("over");
    charCount.classList.remove("warning");
  } else if (numChars > 180) {
    charCount.classList.add("warning");
    charCount.classList.remove("over");
  } else {
    charCount.classList.remove("warning", "over");
  }
}

// 4. Helper function to clear everything
function clearAll() {
  noteText.value = "";
  localStorage.removeItem(STORAGE_KEY_TEXT);
  updateCounts();
}

// 5. On every input event: update counters and save the draft to localStorage
noteText.addEventListener("input", () => {
  updateCounts();
  localStorage.setItem(STORAGE_KEY_TEXT, noteText.value);
});

// 6. Clear button: resets everything
clearBtn.addEventListener("click", clearAll);

// 7. Escape key inside textarea: clears everything
noteText.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearAll();
  }
});

// 8. Helper function to apply theme and update the button label
function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add("dark");
    themeToggle.textContent = "Light mode";
  } else {
    document.body.classList.remove("dark");
    themeToggle.textContent = "Dark mode";
  }
}

// 9. Theme button click event: toggle theme and save preference
themeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  applyTheme(isDark);
  localStorage.setItem(STORAGE_KEY_THEME, isDark ? "dark" : "light");
});

// 10. When the page finishes loading: restore theme, restore draft, and update counts
window.addEventListener("DOMContentLoaded", () => {
  // Restore saved theme (defaults to light mode if nothing is saved)
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
  applyTheme(savedTheme === "dark");

  // Restore saved draft note text
  const savedDraft = localStorage.getItem(STORAGE_KEY_TEXT);
  if (savedDraft !== null) {
    noteText.value = savedDraft;
  }

  // Run updateCounts() once so the initial numbers reflect what was loaded
  updateCounts();
});