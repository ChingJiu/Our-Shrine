const welcomeHeading = document.getElementById("welcomeHeading");
const clock = document.getElementById("clock");
const dateLine = document.getElementById("dateLine");
const dailyQuote = document.getElementById("dailyQuote");
const newQuoteBtn = document.getElementById("newQuoteBtn");

const reminders = [
  "Small progress still counts as progress.",
  "Speak kindly to yourself today.",
  "Keep your promises tiny and doable.",
  "A reset is not failure, it is strategy.",
  "Protect your peace, then build from there."
];

function setWelcomeMessage() {
  const hour = new Date().getHours();
  if (hour < 12) {
    welcomeHeading.textContent = "Good morning, welcome home.";
  } else if (hour < 18) {
    welcomeHeading.textContent = "Good afternoon, welcome home.";
  } else {
    welcomeHeading.textContent = "Good evening, welcome home.";
  }
}

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString();
  dateLine.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function setRandomReminder() {
  const index = Math.floor(Math.random() * reminders.length);
  dailyQuote.textContent = reminders[index];
}

newQuoteBtn.addEventListener("click", setRandomReminder);

setWelcomeMessage();
setRandomReminder();
updateClock();
setInterval(updateClock, 1000);
