// === SECTION: Toggle visibility of forms ===
function toggleForm(id) {
  const sections = ['loginForm', 'registerForm', 'droplist', 'download', 'discord'];
  sections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (sectionId === id) {
      section.classList.toggle('hidden'); // Show/hide the selected section
      if (!section.classList.contains('hidden')) {
        section.scrollIntoView({ behavior: 'smooth' }); // Scroll to it if visible
      }
    } else {
      section.classList.add('hidden'); // Hide all other sections
    }
  });
}

// === SECTION: Target launch date (Philippine Time) ===
const launchDate = new Date("2026-10-05T18:00:00+08:00");

// === SECTION: Countdown logic with full breakdown ===
function startCountdown(serverTime) {
  const clientStart = Date.now();

  function update() {
    const now = new Date(serverTime.getTime() + (Date.now() - clientStart));
    if (launchDate <= now) {
      document.getElementById("timer").textContent = "🟢 Server is Live!";
      return;
    }

    // Create copies to avoid modifying originals
    const current = new Date(now);
    const target = new Date(launchDate);

    let years = target.getFullYear() - current.getFullYear();
    let months = target.getMonth() - current.getMonth();
    let days = target.getDate() - current.getDate();
    let hours = target.getHours() - current.getHours();
    let minutes = target.getMinutes() - current.getMinutes();
    let seconds = target.getSeconds() - current.getSeconds();

    // === SECTION: Normalize negative values ===
    if (seconds < 0) {
      seconds += 60;
      minutes--;
    }
    if (minutes < 0) {
      minutes += 60;
      hours--;
    }
    if (hours < 0) {
      hours += 24;
      days--;
    }
    if (days < 0) {
      const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
      days += prevMonth.getDate();
      months--;
    }
    if (months < 0) {
      months += 12;
      years--;
    }

    // === SECTION: Display countdown ===
    document.getElementById("timer").textContent =
      `${years}y ${months}m ${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  update();
  setInterval(update, 1000);
}

// === SECTION: Fetch current time from Asia/Manila ===
fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Manila")
  .then(res => res.json())
  .then(data => {
    const serverTime = new Date(data.dateTime);
    startCountdown(serverTime);
  })
  .catch(() => {
    document.getElementById("timer").textContent = "⚠️ Failed to load time";
  });