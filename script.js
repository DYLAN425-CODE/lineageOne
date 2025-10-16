import { auth } from './firebase-config.js';

/**
 * Toggles the visibility of different sections on the page.
 * @param {string} id The ID of the section to toggle.
 */
function toggleForm(id) {
  console.log(`[Debug] toggleForm called for: #${id}`);
  const formSections = ['download', 'discord'];
  if (!formSections.includes(id)) {
    return;
  }

  const targetSection = document.getElementById(id);
  const isOpening = targetSection.classList.contains('hidden');
  console.log(`[Debug] #${id} is ${isOpening ? 'opening' : 'closing'}.`);

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
  const sectionsThatHideMainContent = ['download', 'discord'];

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
    console.log('[Debug] Loading server.properties...');
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
        console.log('[Debug] server.properties loaded successfully.');
        return { ...defaultProps, ...properties };
    } catch (error) {
        console.error('Failed to load server.properties:', error);
        return defaultProps;
    }
}

// Expose the function to the global window object so other scripts can call it.
window.loadServerProperties = loadServerProperties;

document.addEventListener('DOMContentLoaded', async () => {

  // ========================================================================
  //  LOAD SERVER PROPERTIES
  // ========================================================================
  window.serverProperties = await loadServerProperties(); // Store globally for toggleForm
  //  SESSION-BASED UI UPDATES
  // ========================================================================
  auth.onAuthStateChanged(user => {
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const logoutButton = document.getElementById('logout-button');
    const countdownSection = document.getElementById('countdown');

    if (user) {
      // User is signed in.
      console.log('[Auth] User is signed in:', user.email);
      // If on the index page, redirect to the dashboard.
      if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html')) {
        window.location.href = '/dashboard';
      }
    } else {
      // User is signed out.
      console.log('[Auth] User is signed out.');
      loginButton?.classList.remove('hidden');
      registerButton?.classList.remove('hidden');
      logoutButton?.classList.add('hidden');
      // Ensure main content is visible for non-logged-in users
      if (typeof toggleForm === 'function') toggleForm(null);
    }
  });

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

  // --- Start Countdown Timer (if enabled) ---
  // This is moved out of loadNews to be independent.
  if (window.serverProperties.COUNTDOWN_ENABLED) {
    const launchDateString = window.serverProperties.DOWNLOAD_AVAILABLE_DATE;
    const launchDate = new Date(launchDateString);
    if (launchDateString && !isNaN(launchDate.getTime())) {
      startCountdown(new Date(), launchDate);
    }
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
  document.getElementById('download-button-header')?.addEventListener('click', () => {
    toggleForm('download');
  });

  document.getElementById('droplist-button')?.addEventListener('click', () => window.location.href = '/droplist');
  
  document.getElementById('item-viewer-button')?.addEventListener('click', () => {
    window.location.href = '/item-viewer';
  });
  document.getElementById('marketplace-button')?.addEventListener('click', () => {
    window.location.href = '/marketplace';
  });

  document.getElementById('discord-button')?.addEventListener('click', () => {
    toggleForm('discord');
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
      }

      currentPlayerIndex++;

      // If we've played all videos, stop. The last video will loop on its own.
      if (currentPlayerIndex >= videoSources.length) {
          return;
      }

      // Preload the next video into the currently inactive player
      inactivePlayer.src = videoSources[currentPlayerIndex];
      // The last video in the source array is the one that will loop forever
      inactivePlayer.loop = (currentPlayerIndex === videoSources.length - 1);
      inactivePlayer.play();

      // Fade out the old video and fade in the new one
      activePlayer.style.opacity = '0';
      inactivePlayer.style.opacity = '1';

      // Swap the active and inactive players for the next transition
      [activePlayer, inactivePlayer] = [inactivePlayer, activePlayer];
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

  /**
   * A simple, non-cryptographic hashing function for simulation purposes.
   * IMPORTANT: This is NOT for production use. It's just to avoid storing plain-text passwords.
   * @param {string} str The string to hash.
   * @returns {Promise<string>} A promise that resolves to the hashed string.
   */
  async function simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // ========================================================================
  //  HANDLE FORM SUBMISSION (SIMULATED BACKEND)
  // ========================================================================

  // --- Download Button Animation ---
  const downloadBtn = document.getElementById('download-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function(event) {
      event.preventDefault(); // Stop the link from navigating immediately

      // Prevent re-clicking while animation is running
      if (this.classList.contains('downloading')) {
        return;
      }

      this.classList.add('downloading');
      const originalButton = this;
      const buttonTextSpan = originalButton.querySelector('.btn-text');
      const originalText = buttonTextSpan.textContent; // Save original text

      let progress = 0;
      const duration = 2000; // 2 seconds for the simulation
      const intervalTime = 20; // Update every 20ms for a smoother animation

      const progressInterval = setInterval(() => {
        progress += intervalTime;
        const currentPercentage = Math.min(Math.floor((progress / duration) * 100), 100);
        
        // Update the button's text directly
        buttonTextSpan.textContent = `${currentPercentage}%`;
        // Update the width of the ::before pseudo-element
        originalButton.style.setProperty('--progress-width', `${currentPercentage}%`);

        if (currentPercentage >= 100) {
          clearInterval(progressInterval);

          // Use the more descriptive info modal with a warning icon
          showInfoModal(
            'Download Not Available', 
            'The game client is not yet ready for download. Please check back on the official launch date.',
            { 
              type: 'warning',
              onOk: () => toggleForm('download') 
            }
          );

          // Clean up and reset the button after a short delay
          setTimeout(() => {
            originalButton.classList.remove('downloading');
            // Reset the button's text and the progress bar width
            buttonTextSpan.textContent = originalText;
            originalButton.style.setProperty('--progress-width', '0%');
          }, 1500);
        }
      }, intervalTime);
    });
  }

  // --- Show/Hide Password Toggle (Moved here to be globally available) ---
  document.querySelectorAll('.password-toggle-icon').forEach(button => {
    button.addEventListener('click', () => {
        const formGroup = button.parentElement;
        const passwordInput = formGroup.querySelector('input[type="password"], input[type="text"]');
        const eyeOpen = button.querySelector('.eye-open');
        const eyeClosed = button.querySelector('.eye-closed');

        if (!passwordInput || !eyeOpen || !eyeClosed) return;

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
    // The 'ok' property checks for HTTP status codes in the 200-299 range.
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json(); // This will only run if the response was 'ok'
    updateStatusUI(data.status || 'offline');
  } catch (error) {
    console.error('Server status check failed:', error);
    updateStatusUI('offline'); // Assume offline if the API check fails
  }
}
