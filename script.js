/**
 * Toggles the visibility of different sections on the page.
 * @param {string} id The ID of the section to toggle.
 */
function toggleForm(id) {
  const formSections = ['loginForm', 'registerForm', 'forgotPasswordForm', 'resetPasswordForm', 'download', 'discord'];
  if (!formSections.includes(id)) {
    return;
  }

  const targetSection = document.getElementById(id);
  const isOpening = targetSection.classList.contains('hidden');

  // Hide all other form sections
  formSections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section && sectionId !== id) {
      section.classList.add('hidden');
    }
  });

  // Toggle the target section's visibility
  targetSection.classList.toggle('hidden');

  // --- Accessibility: Focus on the first input when a form is opened ---
  if (isOpening) {
    const firstInput = targetSection.querySelector('input:not([type="hidden"]), select, button');
    firstInput?.focus();
  }

  // --- Custom Logic for Hiding Sections ---
  // Hide news and gallery when login or register forms are being opened.
  const newsSection = document.getElementById('news');
  const gallerySection = document.getElementById('gallery');
  const loreSection = document.getElementById('lore');
  const downloadSection = document.getElementById('download');
  const discordSection = document.getElementById('discord');
  
  // Define which sections should hide the main content (news/gallery)
  const sectionsThatHideMainContent = ['loginForm', 'registerForm', 'download', 'discord', 'droplist'];

  if (sectionsThatHideMainContent.includes(id) && isOpening) {
    newsSection?.classList.add('hidden');
    gallerySection?.classList.add('hidden');
    loreSection?.classList.add('hidden');
  } else {
    // Only show the main content again if NO other form is currently open.
    // This prevents the layout shift when closing one form to open another.
    const anyFormOpen = formSections.some(sectionId => {
      const section = document.getElementById(sectionId);
      return section && !section.classList.contains('hidden');
    });
    if (!anyFormOpen) {
      // Re-show sections only if they are not disabled by server properties
      const serverProps = window.serverProperties || {};
      if (serverProps.NEWS_ENABLED !== false) newsSection?.classList.remove('hidden');
      if (serverProps.GALLERY_ENABLED !== false) gallerySection?.classList.remove('hidden');
      if (serverProps.LORE_ENABLED !== false) loreSection?.classList.remove('hidden');
    }
  }
}

// ========================================================================
//  DOM CONTENT LOADED - All the code inside this function runs after the page has finished loading.
// ========================================================================

/**
 * Fetches and parses the server.properties file.
 * @returns {Promise<object>} A promise that resolves to an object with the server properties.
 */
async function loadServerProperties() {
    // Default values in case the file is missing or fails to load
    const defaultProps = {
        DOWNLOAD_ENABLED: true, DISCORD_ENABLED: true, NEWS_ENABLED: true,
        COUNTDOWN_ENABLED: true, GALLERY_ENABLED: true, LORE_ENABLED: true,
        DROPLIST_ENABLED: true, MARKETPLACE_ENABLED: true, SERVER_STATUS_ENABLED: true,
        VIDEO_BACKGROUND_ENABLED: true,
        RIGHT_CLICK_PROTECTION_ENABLED: true,
        REMEMBER_ME_DURATION_DAYS: 30,
        DOWNLOAD_AVAILABLE_DATE: '2027-08-10T00:00:00',
        SERVER_STATUS_INTERVAL_SECONDS: 30,
        MAX_CHARACTER_SLOTS: 6,
        NEWS_FILE_PATH: 'news.json',
        SERVER_STATUS_API_URL: '/api/server-status',
        STARTER_INVENTORY_JSON: '[{"name":"Adena","quantity":5000,"stackable":true,"price":1},{"name":"Red Potion","quantity":30,"stackable":true,"price":30},{"name":"Haste Potion","quantity":5,"stackable":true,"price":180},{"name":"Trainee\'s T-shirt","quantity":1,"stackable":false,"droppable":false,"price":100}]',
        SITE_TITLE: 'Lineage',
        LOGO_IMAGE_PATH: 'images/logo-lineage.png',
        FOOTER_TEXT: '&copy; 2025 Lineage 1 Server. All rights reserved.',
        SOCIAL_FACEBOOK_URL: '',
        SOCIAL_YOUTUBE_URL: '',
        MAIN_BACKGROUND_VIDEO_PATH: 'media/lineage2.mp4',
        FAVICON_PATH: 'icon/cs.ico',
        SITE_FONT_URL: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
        SITE_FONT_FAMILY: "'Cinzel', serif"
    };
    try {
        // Add a cache-busting query parameter to ensure the latest version is fetched.
        const response = await fetch(`server.properties?v=${Date.now()}`);
        if (!response.ok) {
            console.warn('server.properties not found. Using default feature settings.');
            return defaultProps;
        }
        const text = await response.text();
        const properties = {};
        const numericKeys = ['REMEMBER_ME_DURATION_DAYS', 'SERVER_STATUS_INTERVAL_SECONDS', 'MAX_CHARACTER_SLOTS', 'DROPLIST_ITEMS_PER_PAGE', 'RING3_LEVEL_REQUIREMENT', 'RING4_LEVEL_REQUIREMENT', 'STACKABLE_PRICE_MIN', 'STACKABLE_PRICE_MAX', 'NONSTACKABLE_PRICE_MIN', 'NONSTACKABLE_PRICE_MAX'];

        text.split('\n').forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#')) {
                const separatorIndex = line.indexOf('=');
                if (separatorIndex === -1) return;

                const key = line.substring(0, separatorIndex).trim();
                let value = line.substring(separatorIndex + 1).trim();

                if (key) {
                    // 1. Handle Booleans
                    if (value.toLowerCase() === 'true') {
                        properties[key] = true;
                    } else if (value.toLowerCase() === 'false') {
                        properties[key] = false;
                    // 2. Handle JSON strings
                    } else if (key.endsWith('_JSON')) {
                        try {
                            properties[key] = JSON.parse(value);
                        } catch (e) {
                            console.error(`Error parsing JSON for key ${key}:`, e);
                            properties[key] = defaultProps[key] ? JSON.parse(defaultProps[key]) : null; // Fallback
                        }
                    // 3. Handle specific numeric keys
                    } else if (numericKeys.includes(key) && !isNaN(Number(value))) {
                        properties[key] = Number(value);
                    // 4. Handle all other cases as strings
                    } else {
                        properties[key] = value;
                    }
                }
            }
        });
        return { ...defaultProps, ...properties };
    } catch (error) {
        console.error('Failed to load server.properties:', error);
        return defaultProps;
    }
}

document.addEventListener('DOMContentLoaded', async () => {

  // ========================================================================
  //  LOAD SERVER PROPERTIES
  // ========================================================================
  window.serverProperties = await loadServerProperties(); // Store globally for toggleForm
  //  SESSION-BASED UI UPDATES
  // ========================================================================
  const session = JSON.parse(localStorage.getItem('session'));
  const loginButton = document.getElementById('login-button');
  const registerButton = document.getElementById('register-button');
  const logoutButton = document.getElementById('logout-button');

  if (session && Date.now() < session.expiry) {
    // User is logged in
    logoutButton?.classList.remove('hidden');
  } else {
    // User is not logged in or session expired
    logoutButton?.classList.add('hidden');
    loginButton?.classList.remove('hidden');
    registerButton?.classList.remove('hidden');
  }

  // --- Feature Flag UI Updates ---
  const downloadButton = document.getElementById('download-button-header');
  const discordButton = document.getElementById('discord-button');
  const newsSection = document.getElementById('news');
  const countdownSection = document.getElementById('countdown');
  const gallerySection = document.getElementById('gallery');
  const loreSection = document.getElementById('lore');
  const droplistButton = document.getElementById('droplist-button');
  const marketplaceButton = document.getElementById('marketplace-button');
  const serverStatusIndicator = document.getElementById('server-status');

  if (!window.serverProperties.DOWNLOAD_ENABLED) {
    downloadButton?.classList.add('hidden');
  }
  if (!window.serverProperties.DISCORD_ENABLED) {
    discordButton?.classList.add('hidden');
  }
  if (!window.serverProperties.COUNTDOWN_ENABLED) {
    countdownSection?.classList.add('hidden');
  }
  if (!window.serverProperties.GALLERY_ENABLED) {
    gallerySection?.classList.add('hidden');
  }
  if (!window.serverProperties.LORE_ENABLED) {
    loreSection?.classList.add('hidden');
  }
  if (!window.serverProperties.DROPLIST_ENABLED) {
    droplistButton?.classList.add('hidden');
  }
  if (!window.serverProperties.MARKETPLACE_ENABLED) {
    marketplaceButton?.classList.add('hidden');
  }
  if (!window.serverProperties.SERVER_STATUS_ENABLED) {
    serverStatusIndicator?.classList.add('hidden');
  }
  if (!window.serverProperties.NEWS_ENABLED) {
    newsSection?.classList.add('hidden');
  } else {
    // Load news, and if countdown is also enabled, pass the flag to it.
    loadNews(window.serverProperties.COUNTDOWN_ENABLED);
  }

  // --- Site Appearance Settings ---
  if (window.serverProperties.SITE_TITLE) {
    document.title = window.serverProperties.SITE_TITLE;
  }
  const logoImage = document.querySelector('header img');
  if (logoImage && window.serverProperties.LOGO_IMAGE_PATH) {
    logoImage.src = window.serverProperties.LOGO_IMAGE_PATH;
  }
  const footerTextContainer = document.getElementById('footer-text-container');
  if (footerTextContainer && window.serverProperties.FOOTER_TEXT) {
    footerTextContainer.innerHTML = window.serverProperties.FOOTER_TEXT;
  }

  // --- Favicon ---
  if (window.serverProperties.FAVICON_PATH) {
    const faviconIco = document.getElementById('favicon-ico');
    const faviconShortcut = document.getElementById('favicon-shortcut');
    if (faviconIco) faviconIco.href = window.serverProperties.FAVICON_PATH;
    if (faviconShortcut) faviconShortcut.href = window.serverProperties.FAVICON_PATH;
  }

  // --- Social Media Links ---
  const socialLinks = {
    'social-facebook': window.serverProperties.SOCIAL_FACEBOOK_URL,
    'social-youtube': window.serverProperties.SOCIAL_YOUTUBE_URL
  };

  for (const [id, url] of Object.entries(socialLinks)) {
    const linkElement = document.getElementById(id);
    if (linkElement && url) {
      linkElement.href = url;
      linkElement.classList.remove('hidden');
    }
  }


  // --- Prevent Right-Click to Discourage Resource Downloading ---
  if (window.serverProperties.RIGHT_CLICK_PROTECTION_ENABLED) {
    document.addEventListener('contextmenu', event => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
      event.preventDefault();
    });
  }

  // --- Video Background Control ---
  if (!window.serverProperties.VIDEO_BACKGROUND_ENABLED) {
    const videoContainer = document.getElementById('bg-video-container');
    if (videoContainer) videoContainer.classList.add('hidden');
  }

  // Conditionally start the server status check
  if (window.serverProperties.SERVER_STATUS_ENABLED) {
    const intervalSeconds = window.serverProperties.SERVER_STATUS_INTERVAL_SECONDS || 30;
    checkServerStatus();
    setInterval(checkServerStatus, intervalSeconds * 1000);
  }

  // --- Prevent Right-Click to Discourage Resource Downloading ---
  // Paalala: Ito ay hindi isang ganap na security measure at madaling i-bypass.
  // Ito ay para lamang pahirapan ang mga kaswal na user sa pag-save ng mga imahe at video.
  document.addEventListener('contextmenu', event => {
    // Payagan ang right-click sa mga form input para sa mas magandang user experience (e.g., paste).
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    event.preventDefault();
  });
  // --- Clear form fields on page load/refresh ---
  // This prevents browsers from auto-filling fields after a refresh.
  const formsToReset = ['login-form'];
  formsToReset.forEach(formId => {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
    }
  });

  // --- Stagger Fade-in Animations for a smoother entrance ---
  const fadeInElements = document.querySelectorAll('#main-content .fade-in');
  fadeInElements.forEach((el, index) => {
    el.style.animationDelay = `${index * 0.1}s`; // Each section will be delayed by 0.1s
  });

  // --- Animate Title Letters ---
  document.querySelectorAll('.cinematic-title').forEach(title => {
    // Use the element's text content if data-text is not available
    const text = title.dataset.text || title.textContent;
    title.innerHTML = ''; // Clear original text

    text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.textContent = char;
        // Use a CSS variable for the delay, creating a staggered effect
        span.style.setProperty('--delay', `${index * 0.05}s`); // Slightly faster delay
        
        // Ensure space characters are preserved and have width
        if (char === ' ') {
            span.style.width = '0.5em';
        }
        title.appendChild(span);
    });
  });


  // ========================================================================
  //  EVENT LISTENERS FOR HEADER NAVIGATION BUTTONS
  // ========================================================================
  document.getElementById('login-button')?.addEventListener('click', () => {
    const currentSession = JSON.parse(localStorage.getItem('session'));
    if (currentSession && Date.now() < currentSession.expiry) {
      window.location.href = 'dashboard.html';
    } else {
      toggleForm('loginForm');
    }
  });
  document.getElementById('register-button')?.addEventListener('click', () => {
    const currentSession = JSON.parse(localStorage.getItem('session'));
    if (currentSession && Date.now() < currentSession.expiry) {
      // The user is already logged in.
      showInfoModal('Already Logged In', 'You are already logged in and cannot register a new account.', { type: 'info' });
    } else {
      toggleForm('registerForm');
    }
  });
  document.getElementById('download-button-header')?.addEventListener('click', () => {
    toggleForm('download');
  });

  document.getElementById('discord-button')?.addEventListener('click', () => {
    toggleForm('discord');
  });
  document.getElementById('forgot-password-button')?.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default link behavior
    toggleForm('forgotPasswordForm');
  });

  document.getElementById('logout-button')?.addEventListener('click', () => {
    // Update lastOnline for the active character before logging out
    const activeChar = JSON.parse(localStorage.getItem('activeCharacter'));
    if (activeChar) {
        const allChars = JSON.parse(localStorage.getItem('characters')) || [];
        const charIndex = allChars.findIndex(c => c.name === activeChar.name);
        if (charIndex !== -1) {
            allChars[charIndex].lastOnline = new Date().toISOString();
            localStorage.setItem('characters', JSON.stringify(allChars));
        }
    }

    localStorage.removeItem('session');
    window.location.reload(); // Reload the page to reflect the logged-out state
  });

  // ========================================================================
  //  SEAMLESS BACKGROUND VIDEO PLAYLIST
  // ========================================================================
  const videoContainer = document.getElementById('bg-video-container');
  const mainContent = document.getElementById('main-content');

  if (videoContainer) {
    const videoSources = [
      'media/lineage3.mp4',
      window.serverProperties.MAIN_BACKGROUND_VIDEO_PATH || 'media/lineage2.mp4' // This is the final video that will loop
    ];
    let currentPlayerIndex = 0;

    // Create two video players for seamless cross-fading
    const player1 = videoContainer.querySelector('video'); // The one from HTML
    const player2 = document.createElement('video');
    
    [player1, player2].forEach(p => {
        p.muted = true;
        p.playsinline = true;
        p.style.transition = 'opacity 1.5s ease-in-out';
    });

    player2.style.opacity = '0';
    videoContainer.appendChild(player2);

    let activePlayer = player1;
    let inactivePlayer = player2;

    function playNextVideo() {
        // When the first video ends, show the main content
        if (currentPlayerIndex === 0 && mainContent) {
            mainContent.classList.remove('hidden');
            // The hash check logic has been moved to the main DOMContentLoaded block to run reliably.
        }

        currentPlayerIndex++;

        // If it's the last video, set it to loop and stop here
        if (currentPlayerIndex >= videoSources.length) {
            // This logic is for playlists longer than 2. For 2, it just loops the second.
            return;
        }

        // This was causing an error because currentPlayerIndex was out of bounds.
        // The logic should just transition to the next video in the array.
        inactivePlayer.src = videoSources[currentPlayerIndex]; // Preload the next video
        inactivePlayer.loop = (currentPlayerIndex === videoSources.length - 1); // Set loop for the last video

        // Wait until the next video is ready to play before fading
        inactivePlayer.addEventListener('canplaythrough', () => {
            inactivePlayer.play();
            activePlayer.style.opacity = '0';
            inactivePlayer.style.opacity = '1';

            // Swap player roles
            [activePlayer, inactivePlayer] = [inactivePlayer, activePlayer];

            // If the new active player is not the last one, listen for its 'ended' event
            if (!activePlayer.loop) {
                activePlayer.addEventListener('ended', playNextVideo, { once: true });
            }
        }, { once: true }); // Use { once: true } to ensure this listener only fires once
    }

    // Start the sequence
    activePlayer.addEventListener('ended', playNextVideo, { once: true });
    activePlayer.play(); // Manually start the first video
  }


  // ========================================================================
  //  DYNAMIC NEWS LOADER
  // ========================================================================
  async function loadNews(isCountdownEnabled) {
    const newsContainer = document.getElementById('news-container');
    if (!newsContainer) return;

    try {
      const response = await fetch(window.serverProperties.NEWS_FILE_PATH || 'news.json');
      const newsItems = await response.json();

      newsContainer.innerHTML = ''; // Clear the "Loading..." message

      newsItems.forEach((item, index) => {
        const article = document.createElement('article');
        article.className = 'news-item';
        // Assign a custom property for the CSS animation-delay
        article.style.setProperty('--item-index', index);

        article.innerHTML = `
          <header class="flex justify-between items-baseline mb-2">
            <h3 class="text-xl font-bold text-yellow-300">${escapeHTML(item.title)}</h3>
            <time class="text-sm text-gray-400">${escapeHTML(item.date)}</time>
          </header>
          <div class="news-content text-gray-300">
            <p>
              ${item.summary} <!-- Note: The summary in news.json is trusted and contains a link. For user-generated content, this should be escaped. -->
              <span class="news-more-text">${escapeHTML(item.fullText)}</span>
            </p>
            <a href="#" class="news-toggle-link">Read More...</a>
          </div>
        `;
        newsContainer.appendChild(article);
      });

      // Add event listener for dynamically loaded news links (e.g., "Download" link)
      newsContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('news-download-link')) {
          event.preventDefault(); // Prevent default link behavior
          toggleForm('download');
        }
      });


      // Now that the news items are in the DOM, attach the "Read More" event listeners
      document.querySelectorAll('.news-toggle-link').forEach(link => {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          const content = link.closest('.news-content');
          if (content) {
            content.classList.toggle('expanded');
            link.textContent = content.classList.contains('expanded') ? 'Read Less...' : 'Read More...';
          }
        });
      });

      // --- Start Countdown Timer using date from news ---
      const launchAnnouncement = newsItems.find(item => item.launchDateISO);
      if (isCountdownEnabled && launchAnnouncement) {
        const launchDate = new Date(launchAnnouncement.launchDateISO);
        // Check if the launchDate is a valid date, then start the countdown using the client's local time.
        if (!isNaN(launchDate.getTime())) {
            startCountdown(new Date(), launchDate);
        }
      }
    } catch (error) {
      console.error('Failed to load news:', error);
      newsContainer.innerHTML = '<p class="text-center text-red-500">Could not load news at this time.</p>';
    }
  }

  // ========================================================================
  //  ACCESSIBILITY HELPER FUNCTIONS
  // ========================================================================
  /**
   * Displays an error message for a specific form field.
   * @param {HTMLInputElement} inputElement The input element with the error.
   * @param {string} message The error message to display.
   */
  function showFieldError(inputElement, message) {
    const errorElement = document.getElementById(`${inputElement.id}-error`);
    if (errorElement) {
      errorElement.textContent = message;
    }
    inputElement.setAttribute('aria-invalid', 'true');
  }

  /** Clears all error messages from a form. */
  function clearFormErrors(formElement) {
    formElement.querySelectorAll('[id$="-error"]').forEach(el => el.textContent = '');
    formElement.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function escapeHTML(str) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
  }

  /**
   * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed.
   * @param {Function} func The function to debounce.
   * @param {number} wait The number of milliseconds to delay.
   * @returns {Function} The new debounced function.
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => { clearTimeout(timeout); func(...args); };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  // ========================================================================
  //  HANDLE FORM SUBMISSION (SIMULATED BACKEND)
  // ========================================================================

  // --- Registration Form ---
  const registerFormContainer = document.getElementById('registerForm');
  const registrationForm = document.getElementById('registration-form');

  if (registrationForm && registerFormContainer) {
    registrationForm.addEventListener('submit', function(event) {
      event.preventDefault(); // Prevent the form from submitting to register.php
      clearFormErrors(this);

      const username = this.elements.username.value;
      const email = this.elements.email.value;
      const usernameInput = this.elements.username;
      const emailInput = this.elements.email;

      // --- Check if username already exists (simulation using localStorage) ---
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
      const userExists = registeredUsers.some(user => user.username.toLowerCase() === username.toLowerCase());
      // Check if email exists, ensuring user.email is not undefined
      const emailExists = registeredUsers.some(user => user.email && user.email.toLowerCase() === email.toLowerCase());

      if (userExists) {
        // If user exists, show an error message
        showFieldError(usernameInput, 'Username already exists. Please try another.');
        usernameInput.focus();
      } else if (emailExists) {
        showFieldError(emailInput, 'Email is already registered. Please use another.');
        emailInput.focus();
      } else {
        // If user does not exist, proceed with registration
        const newUser = { username: username, email: email, password: this.elements.password.value };
        registeredUsers.push(newUser);
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

        // Hide the registration form
        registerFormContainer.classList.add('hidden');

        // Show the login form and display the success message
        const loginForm = document.getElementById('loginForm');
        const loginMessage = document.getElementById('login-message');
        if (loginForm && loginMessage) {
          loginMessage.innerHTML = `<p class="font-bold text-green-400">✅ Registration Successful! Please log in.</p>`;
          loginForm.classList.remove('hidden');
          loginForm.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  // --- Show/Hide Password Toggle ---
  document.querySelectorAll('.password-toggle-icon').forEach(button => {
    button.addEventListener('click', () => {
      const formGroup = button.parentElement;
      const passwordInput = formGroup.querySelector('input[type="password"], input[type="text"]');
      const eyeOpen = button.querySelector('.eye-open');
      const eyeClosed = button.querySelector('.eye-closed');

      const isPressed = button.getAttribute('aria-pressed') === 'true';

      if (!isPressed) {
        // Show password
        passwordInput.type = 'text';
        eyeOpen.classList.add('hidden');
        eyeClosed.classList.remove('hidden');
        button.setAttribute('aria-label', 'Hide password');
        button.setAttribute('aria-pressed', 'true');
      } else {
        // Hide password
        passwordInput.type = 'password';
        eyeOpen.classList.remove('hidden');
        eyeClosed.classList.add('hidden');
        button.setAttribute('aria-label', 'Show password');
        button.setAttribute('aria-pressed', 'false');
      }
    });
  });

  // --- Login Form ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(event) {
      event.preventDefault(); // Prevent submitting to login.php
      clearFormErrors(this);

      const username = this.elements.username.value;
      const password = this.elements.password.value;
      const usernameInput = this.elements.username;
      const rememberMe = this.elements['remember-me'].checked;

      // --- Check if username and password are correct (simulation using localStorage) ---
      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
      const user = registeredUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

      if (user) {
        // If user is found and password is correct, proceed to login
        // Set session with an expiry time (e.g., 1 hour)
        const rememberMeDays = window.serverProperties.REMEMBER_ME_DURATION_DAYS || 30;
        const shortSession = 60 * 60 * 1000; // 1 hour in milliseconds
        const longSession = rememberMeDays * 24 * 60 * 60 * 1000;
        const sessionDuration = rememberMe ? longSession : shortSession;
        const expiryTime = Date.now() + sessionDuration; 
        const session = {
            username: username,
            expiry: expiryTime
        };
        localStorage.setItem('session', JSON.stringify(session));
        window.location.href = 'dashboard.html'; // Redirect to dashboard
      } else {
        // If user not found or password incorrect, show error
        showFieldError(usernameInput, 'Invalid username or password.');
        usernameInput.focus();
      }
    });
  }

  // --- Forgot Password Form ---
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', function(event) {
      event.preventDefault();

      const email = this.elements.email.value;
      const messageDiv = document.getElementById('forgot-password-message');

      const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
      const user = registeredUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

      if (user) {
        // In a real application, you would trigger a server-side process to send an email.
        // For this simulation, we will just show a success message.

        // --- SIMULATION ---
        // 1. Generate a fake reset code and expiry time
        const resetCode = '123456'; // For simulation, we use a static code
        const expiryTime = Date.now() + (15 * 60 * 1000); // Code expires in 15 minutes

        // 2. Save the code and expiry to the user object in localStorage
        user.resetCode = resetCode;
        user.resetCodeExpiry = expiryTime;
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

        // 3. Show a success message and instructions
        messageDiv.innerHTML = `
          <div class="bg-gray-800 p-4 rounded-lg">
            <p class="text-green-400">✅ A password reset code has been sent to your email.</p>
            <p class="text-xs text-gray-400 mt-2">(This is a simulation. Your code is: <strong class="text-yellow-300">${resetCode}</strong>)</p>
          </div>
        `;

        // 4. Hide the 'forgot password' form and show the 'reset password' form
        this.parentElement.classList.add('hidden');
        const resetFormSection = document.getElementById('resetPasswordForm');
        const resetEmailInput = document.getElementById('reset-email');
        if (resetFormSection && resetEmailInput) {
            resetEmailInput.value = email; // Store the email in the hidden field
            resetFormSection.classList.remove('hidden');
            resetFormSection.scrollIntoView({ behavior: 'smooth' });
        }

      } else {
        // For security, we show the same message even if the user is not found.
        messageDiv.innerHTML = `<p class="font-bold text-red-500">❌ No account found with that email address.</p>`;
      }
    });
  }

  // --- Reset Password Form (The new form) ---
  const resetPasswordForm = document.getElementById('reset-password-form');
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const messageDiv = document.getElementById('reset-password-message');
        const email = this.elements.email.value;
        const code = this.elements.code.value;
        const newPassword = this.elements.new_password.value;

        const registeredUsers = JSON.parse(localStorage.getItem('registeredUsers')) || [];
        const user = registeredUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

        // --- Validation ---
        if (!user || user.resetCode !== code) {
            messageDiv.innerHTML = `<p class="font-bold text-red-500">❌ Invalid reset code.</p>`;
            return;
        }
        if (Date.now() > user.resetCodeExpiry) {
            messageDiv.innerHTML = `<p class="font-bold text-red-500">❌ Reset code has expired. Please request a new one.</p>`;
            return;
        }

        // --- Success: Update password ---
        user.password = newPassword;
        delete user.resetCode; // Clean up the used code and expiry
        delete user.resetCodeExpiry;
        localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));

        // --- Show success and redirect to login ---
        this.parentElement.classList.add('hidden');
        const loginForm = document.getElementById('loginForm');
        const loginMessage = document.getElementById('login-message');
        if (loginForm && loginMessage) {
            loginMessage.innerHTML = `<p class="font-bold text-green-400">✅ Password has been reset successfully! Please log in.</p>`;
            loginForm.classList.remove('hidden');
            loginForm.scrollIntoView({ behavior: 'smooth' });
        }
    });
  }

  // --- Download Button Animation ---
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function(event) {
      event.preventDefault(); // Stop the link from navigating immediately

      // --- DATE CHECK ---
      // Define the date when the download becomes available
      const downloadAvailableDate = new Date(window.serverProperties.DOWNLOAD_AVAILABLE_DATE + "+08:00");
      const now = new Date(); // Use the user's current time for this check

      if (now < downloadAvailableDate) {
        showInfoModal('Download Not Available', 'The game client will be available for download starting August 10, 2027.', { type: 'info' });
        return; // Stop the function if the download is not yet available
      }

      // Prevent re-clicking while animation is running
      if (this.classList.contains('downloading')) {
        return;
      }
      this.classList.add('downloading');

      const progressContainer = this.querySelector('.download-progress-container');
      const percentageText = this.querySelector('.download-percentage');
      const downloadUrl = this.href;
      const originalButton = this; // Keep a reference to the button

      progressContainer.classList.remove('hidden');

      let progress = 0;
      const duration = 3000; // 3 seconds for the simulation
      const intervalTime = 30; // Update every 30ms

      const progressInterval = setInterval(() => {
        progress++;
        const currentPercentage = Math.min(Math.floor((progress * intervalTime / duration) * 100), 100);
        percentageText.textContent = `${currentPercentage}%`;

        if (currentPercentage >= 100) {
          clearInterval(progressInterval);

          // Change text to "Complete!" and start the actual download
          percentageText.textContent = 'Complete!';
          window.location.href = downloadUrl;

          // Reset the button after a short delay
          setTimeout(() => {
            originalButton.classList.remove('downloading');
            progressContainer.classList.add('hidden');
            percentageText.textContent = '0%'; // Reset for next time
          }, 2000);
        }
      }, intervalTime);
    });
  }

  // ========================================================================
  //  IMAGE GALLERY LIGHTBOX
  // ========================================================================
  const galleryGrid = document.getElementById('gallery-grid');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  if (galleryGrid && lightbox && lightboxImg && lightboxClose && lightboxPrev && lightboxNext) {
    const galleryImages = Array.from(galleryGrid.querySelectorAll('img'));
    let currentIndex = 0;

    function showImage(index) {
      if (index < 0 || index >= galleryImages.length) return;
      currentIndex = index;
      lightboxImg.src = galleryImages[currentIndex].src;
      
      // Add a little "pop" animation on image change
      lightboxImg.style.transform = 'scale(0.98)';
      setTimeout(() => { lightboxImg.style.transform = 'scale(1)'; }, 50);
    }

    galleryGrid.addEventListener('click', (event) => {
      const item = event.target.closest('.gallery-item');
      if (item) {
        const img = item.querySelector('img');
        if (img) {
          const index = galleryImages.indexOf(img);
          showImage(index);
          lightbox.classList.remove('hidden');
          // Use a timeout to allow the display property to apply before transitioning opacity
          document.getElementById('main-content')?.classList.add('hidden');
          setTimeout(() => lightbox.classList.add('open'), 10);
          document.addEventListener('keydown', handleKeyPress);
        }
      }
    });

    const closeLightbox = () => {
      document.getElementById('main-content')?.classList.remove('hidden');
      lightbox.classList.remove('open');
      document.removeEventListener('keydown', handleKeyPress);
      // Wait for the transition to finish before hiding it
      setTimeout(() => lightbox.classList.add('hidden'), 300);
    };

    const showNext = () => {
      const nextIndex = (currentIndex + 1) % galleryImages.length;
      showImage(nextIndex);
    };

    const showPrev = () => {
      const prevIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
      showImage(prevIndex);
    };

    const handleKeyPress = (event) => {
      if (event.key === 'ArrowRight') showNext();
      if (event.key === 'ArrowLeft') showPrev();
      if (event.key === 'Escape') closeLightbox();
    };

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxNext.addEventListener('click', showNext);
    lightboxPrev.addEventListener('click', showPrev);
    // Also close lightbox if the background is clicked
    lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
  }

  // --- Intersection Observer for Gallery Images ---
  const galleryItems = document.querySelectorAll('.gallery-item');
  if (galleryItems.length > 0) {
    const observerOptions = {
      root: null, // Use the viewport as the root
      rootMargin: '0px',
      threshold: 0.1 // Trigger when 10% of the item is visible
    };

    const galleryObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Stop observing once it's visible
        }
      });
    }, observerOptions);

    // Observe each gallery item
    galleryItems.forEach(item => galleryObserver.observe(item));

    // --- Intersection Observer for Gallery Videos (Play/Pause on scroll) ---
    const galleryVideos = document.querySelectorAll('.gallery-item video');
    if (galleryVideos.length > 0) {
      const videoObserverOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // Trigger when 50% of the video is visible
      };

      const videoObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          const video = entry.target;
          if (entry.isIntersecting) {
            // Video is on screen, play it
            video.play().catch(error => {
              // Autoplay was prevented, which can happen on some browsers.
              // Since the video is muted, this is less common, but good to handle.
              console.warn("Video autoplay was prevented:", error);
            });
          } else {
            // Video is off screen, pause it
            video.pause();
          }
        });
      }, videoObserverOptions);

      galleryVideos.forEach(video => videoObserver.observe(video));
    }
  }
});

// ========================================================================
//  COUNTDOWN TIMER
// ========================================================================

/**
 * Starts the countdown timer.
 * @param {Date} serverTime The current time from the server.
 * @param {Date} launchDate The target launch date.
 */
function startCountdown(serverTime, launchDate) {
  const clientStart = Date.now();

  const timerInterval = setInterval(() => {
    const now = new Date(serverTime.getTime() + (Date.now() - clientStart));
    const timerEl = document.getElementById("timer");
    if (!timerEl) return;

    if (now >= launchDate) {
      timerEl.innerHTML = '<div class="text-center text-green-400 font-bold">Server is Live!</div>';
      clearInterval(timerInterval); // Stop the timer when it's done
      return;
    }

    // Use iterative subtraction to extract full years and months correctly
    const temp = new Date(now.getTime());
    let years = 0;
    while (true) {
      const test = new Date(temp.getFullYear() + 1, temp.getMonth(), temp.getDate(), temp.getHours(), temp.getMinutes(), temp.getSeconds());
      if (test <= launchDate) {
        temp.setFullYear(temp.getFullYear() + 1);
        years++;
      } else break;
    }

    let months = 0;
    while (true) {
      // Create a new date object for testing to avoid modifying 'temp' directly in the check
      const testDate = new Date(temp);
      testDate.setMonth(testDate.getMonth() + 1);
      const test = testDate;
      if (test <= launchDate) {
        temp.setMonth(temp.getMonth() + 1);
        months++;
      } else break;
    }

    // remaining time after removing years+months
    let diffMs = launchDate - temp;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    diffMs -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    diffMs -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diffMs / (60 * 1000));
    diffMs -= minutes * 60 * 1000;
    const seconds = Math.floor(diffMs / 1000);

    function unitBlock(value, label) {
      // Don't pad 'Years' with a leading zero, but pad everything else.
      const displayValue = (label === 'Years') ? String(value) : String(value).padStart(2, '0');

      const id = `timer-${label.toLowerCase()}`;
      const el = document.getElementById(id);
      // If the element exists and its content is different, add the 'tick' class for animation
      if (el && el.textContent !== displayValue) {
        el.classList.add('tick');
        // Remove the class after the animation completes to allow it to re-trigger
        setTimeout(() => el.classList.remove('tick'), 200);
      }

      return `
        <div class="timer-unit">
          <div id="${id}" class="timer-value">${displayValue}</div>
          <div class="timer-label">${label}</div>
        </div>
      `;
    }

    function separator() {
        return `<div class="timer-separator">:</div>`;
    }

    timerEl.innerHTML = `
      <div class="flex flex-wrap justify-center items-start gap-2 sm:gap-3">
        ${unitBlock(years, 'Years')}
        ${separator()}
        ${unitBlock(months, 'Months')}
        ${separator()}
        ${unitBlock(days, 'Days')}
        ${separator()}
        ${unitBlock(hours, 'Hours')}
        ${separator()}
        ${unitBlock(minutes, 'Minutes')}
        ${separator()}
        ${unitBlock(seconds, 'Seconds')}
      </div>
    `;
  }, 1000);
}

// ========================================================================
//  REAL-TIME SERVER STATUS CHECK
// ========================================================================

/**
 * Updates the server status indicator on the UI.
 * @param {'online' | 'offline' | 'checking'} status The current status of the server.
 */
function updateStatusUI(status) {
  const serverStatus = document.getElementById('server-status');
  const statusDot = document.querySelector('#server-status .status-dot');
  const statusText = document.getElementById('status-text');
  if (!serverStatus || !statusDot || !statusText) return;

  // Remove previous status classes from the parent container
  serverStatus.classList.remove('status-online', 'status-offline', 'status-checking');

  if (status === 'online') {
    statusText.textContent = 'Online';
    statusDot.className = 'status-dot online';
    serverStatus.classList.add('status-online');
  } else if (status === 'offline') {
    statusText.textContent = 'Offline';
    statusDot.className = 'status-dot offline';
    serverStatus.classList.add('status-offline');
  } else { // 'checking'
    statusText.textContent = 'Checking...';
    statusDot.className = 'status-dot'; // Default gray pulsing
  }
}

/**
 * Fetches the server status from the backend API.
 */
async function checkServerStatus() {
  // This is the API endpoint you will need to create on your web server.
  // It should return a JSON like: {"status": "online"} or {"status": "offline"}
  const apiUrl = window.serverProperties.SERVER_STATUS_API_URL || '/api/server-status'; 

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    updateStatusUI(data.status);
  } catch (error) {
    console.error('Server status check failed:', error);
    updateStatusUI('offline'); // Assume offline if the API check fails
  }
}
