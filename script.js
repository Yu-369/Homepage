document.addEventListener('DOMContentLoaded', function() {

    // --- A. ON PAGE LOAD & RIPPLE EFFECT ---
    setTimeout(() => {
        document.body.classList.remove('anim-load');
    }, 1000);

    function createRipple(event) {
        if (event.target.closest('.delete-btn')) {
            return;
        }
        const button = event.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
        circle.classList.add('ripple');

        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) {
            ripple.remove();
        }
        button.appendChild(circle);
    }

    // --- C. DOM Element Selections ---
    const linksGrid = document.getElementById('links-grid');
    const editFavoritesFab = document.getElementById('edit-favorites-fab');
    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const voiceSearchBtn = document.getElementById('mic-btn');
    const actionButtonToggles = document.querySelectorAll('.action-button-toggle');
    const iconStyleToggle = document.getElementById('icon-style-toggle');
    const hiddenSitesGroup = document.getElementById('hidden-sites-group');
    const hiddenSitesList = document.getElementById('hidden-sites-list');
    const pillsSlider = document.getElementById('pills-slider');

    // --- D. CORE DATA MANAGEMENT ---
    let hiddenSites = [];
    let visiblePillCount = 6;

    function getHiddenSites() {
        const stored = localStorage.getItem('homepage_hidden_sites');
        hiddenSites = stored ? JSON.parse(stored) : [];
    }

    function saveHiddenSites() {
        localStorage.setItem('homepage_hidden_sites', JSON.stringify(hiddenSites));
    }

    function trackSiteVisit(url) {
        const urlObj = new URL(url);
        const key = `${urlObj.protocol}//${urlObj.hostname}`;
        const sites = JSON.parse(localStorage.getItem('homepage_sites_data')) || {};

        if (sites[key]) {
            sites[key].count++;
        } else {
            let name = urlObj.hostname.replace('www.', '').split('.')[0];
            name = name.charAt(0).toUpperCase() + name.slice(1);
            sites[key] = {
                name: name,
                url: key,
                count: 1
            };
        }
        localStorage.setItem('homepage_sites_data', JSON.stringify(sites));
    }

    function renderSmartGrid() {
        const sites = JSON.parse(localStorage.getItem('homepage_sites_data')) || {};
        const sitesArray = Object.values(sites);

        const visibleSites = sitesArray
            .filter(site => !hiddenSites.includes(site.url))
            .sort((a, b) => b.count - a.count)
            .slice(0, visiblePillCount);

        linksGrid.innerHTML = '';

        visibleSites.forEach((site) => {
            const linkCard = document.createElement('div');
            linkCard.className = 'link-card';
            linkCard.dataset.url = site.url;
            linkCard.dataset.name = site.name;
            linkCard.innerHTML = `<div class="link-card-content"><div class="icon-container"><img src="https://www.google.com/s2/favicons?domain=${site.url}&sz=64" alt=""></div><span>${site.name}</span><button class="delete-btn" aria-label="Hide ${site.name}"><span class="material-symbols-outlined">close</span></button></div>`;
            linksGrid.appendChild(linkCard);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'add-favorite-btn';
        addBtn.innerHTML = `<span class="material-symbols-outlined">add</span>`;
        linksGrid.appendChild(addBtn);

        document.querySelectorAll('.link-card-content, .add-favorite-btn, .fab, #settings-close-btn, .switch-row, .hidden-site-row')
            .forEach(elem => elem.addEventListener('mousedown', createRipple));
    }

    // --- E. SETTINGS PANEL LOGIC ---
    let sliderInitialized = false;

    function openSettings() {
        if (!sliderInitialized && pillsSlider) {
            buildTicks();
            sliderInitialized = true;
        }
        if (pillsSlider) {
            updateSliderUI();
        }
        renderHiddenSitesList();
        document.body.classList.add('settings-open');
    }

    function closeSettings() {
        document.body.classList.remove('settings-open');
    }

    function renderHiddenSitesList() {
        hiddenSitesList.innerHTML = '';
        if (hiddenSites.length > 0) {
            hiddenSitesGroup.classList.remove('hidden');
            hiddenSites.forEach(url => {
                const row = document.createElement('div');
                row.className = 'hidden-site-row';
                const hostname = new URL(url).hostname;
                row.innerHTML = `<span>${hostname}</span><button class="unhide-btn" data-url="${url}">Unhide</button>`;
                hiddenSitesList.appendChild(row);
            });
        } else {
            hiddenSitesGroup.classList.add('hidden');
        }
    }

    hiddenSitesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('unhide-btn')) {
            const urlToUnhide = e.target.dataset.url;
            hiddenSites = hiddenSites.filter(url => url !== urlToUnhide);
            saveHiddenSites();
            renderHiddenSitesList();
            renderSmartGrid();
        }
    });

    // --- F. MASTER CLICK HANDLER FOR MAIN GRID ---
    linksGrid.addEventListener('click', function(e) {
        const target = e.target;
        const deleteButton = target.closest('.delete-btn');
        const addButton = target.closest('.add-favorite-btn');
        const linkContent = target.closest('.link-card-content');

        if (deleteButton) {
            const linkCard = deleteButton.closest('.link-card');
            const urlToHide = linkCard.dataset.url;
            if (!hiddenSites.includes(urlToHide)) {
                hiddenSites.push(urlToHide);
                saveHiddenSites();
                renderSmartGrid();
            }
            return;
        }

        if (addButton) {
            const url = prompt('Enter a website URL to add to your history:');
            if (url) {
                try {
                    trackSiteVisit(url);
                    renderSmartGrid();
                } catch (e) {
                    alert('Invalid URL. Please enter a full URL (e.g., https://www.google.com)');
                }
            }
            return;
        }

        if (linkContent && !document.body.classList.contains('edit-mode')) {
            const linkCard = linkContent.closest('.link-card');
            trackSiteVisit(linkCard.dataset.url);
            renderSmartGrid();
            window.location.href = linkCard.dataset.url;
        }
    });

    // --- G. SLIDER LOGIC ---
    const bubble = document.getElementById('bubble');
    const ticks = document.querySelector('.ticks');
    const sliderWrap = document.querySelector('.slider-wrap');

    function buildTicks() {
        if (!ticks || !pillsSlider) return;

        ticks.innerHTML = '';
        const min = Number(pillsSlider.min);
        const max = Number(pillsSlider.max);

        for (let v = min; v <= max; v++) {
            const tick = document.createElement('span');
            tick.className = 'tick';
            tick.style.left = `${((v - min) / (max - min)) * 100}%`;
            ticks.appendChild(tick);
        }
    }

    function updateSliderUI() {
        if (!pillsSlider || !sliderWrap) return;

        const min = Number(pillsSlider.min);
        const max = Number(pillsSlider.max);
        const val = Number(pillsSlider.value);
        const percent = ((val - min) / (max - min)) * 100;

        pillsSlider.style.setProperty('--pct', `${percent}%`);
        bubble.textContent = val;

        const rect = pillsSlider.getBoundingClientRect();
        const wrapRect = sliderWrap.getBoundingClientRect();
        const x = (percent / 100) * (rect.width - 4) + 2;
        bubble.style.left = `${x + rect.left - wrapRect.left}px`;
    }

    if (pillsSlider) {
        pillsSlider.addEventListener('input', () => {
            visiblePillCount = pillsSlider.value;
            localStorage.setItem('homepage_pill_count', visiblePillCount);
            updateSliderUI();
            renderSmartGrid();
        });
    }

    window.addEventListener('resize', updateSliderUI);

    // --- H. OTHER LOGIC (BUTTONS, SETTINGS) ---
    editFavoritesFab.addEventListener('click', () => {
        const isEditing = document.body.classList.toggle('edit-mode');
        editFavoritesFab.classList.toggle('active', isEditing);
        const icon = editFavoritesFab.querySelector('.material-symbols-outlined');
        icon.textContent = isEditing ? 'done' : 'edit';
    });

    settingsToggleBtn.addEventListener('click', openSettings);
    settingsCloseBtn.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);

    const settingRows = document.querySelectorAll('.switch-row');
    settingRows.forEach(row => {
        row.addEventListener('click', function(event) {
            const input = row.querySelector('input');
            if (input && event.target.tagName !== 'INPUT') {
                input.click();
            }
        });
    });

    actionButtonToggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            const checkedToggles = document.querySelectorAll('.action-button-toggle:checked');
            if (checkedToggles.length > 3) {
                alert('You can only select a maximum of 3 buttons.');
                toggle.checked = false;
                return;
            }
            const targetId = toggle.dataset.targetId;
            const targetButton = document.getElementById(targetId);
            if (targetButton) {
                targetButton.classList.toggle('hidden', !toggle.checked);
            }
            localStorage.setItem(`setting_visibility_${targetId}`, toggle.checked);
        });
    });

    iconStyleToggle.addEventListener('change', () => {
        document.body.classList.toggle('icons-filled', iconStyleToggle.checked);
        localStorage.setItem('setting_iconStyle', iconStyleToggle.checked ? 'filled' : 'outlined');
    });

    function loadSettings() {
        const hasSettings = !!localStorage.getItem('setting_visibility_mic-btn');

        actionButtonToggles.forEach(toggle => {
            const targetId = toggle.dataset.targetId;
            let isVisible;

            if (hasSettings) {
                isVisible = localStorage.getItem(`setting_visibility_${targetId}`) === 'true';
            } else {
                // Default settings if none are saved
                isVisible = (targetId === 'mic-btn' || targetId === 'lens-btn' || targetId === 'ai-btn');
            }
            toggle.checked = isVisible;
            document.getElementById(targetId)?.classList.toggle('hidden', !isVisible);
        });

        const iconStyle = localStorage.getItem('setting_iconStyle') || 'outlined';
        iconStyleToggle.checked = iconStyle === 'filled';
        document.body.classList.toggle('icons-filled', iconStyle === 'filled');
    }

    const siteSearchPatterns = {
        'youtube': 'https://www.youtube.com/results?search_query=',
        'reddit': 'https://www.reddit.com/search/?q=',
        'amazon': 'https://www.amazon.com/s?k=',
        'github': 'https://github.com/search?q=',
        'wikipedia': 'https://en.wikipedia.org/wiki/Special:Search?search='
    };

    // --- SEARCH LOGIC ---
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        // 1. Check if it's a URL-like string (contains a dot or protocol).
        if (query.includes('.') || query.includes('://')) {
            try {
                const url = new URL(query.includes('://') ? query : `https://${query}`);
                trackSiteVisit(url.href);
                renderSmartGrid(); // Update grid in background
                window.location.href = url.href;
                return;
            } catch (e) {
                // If it looks like a URL but isn't valid, fall through to Google search.
            }
        }

        // 2. Check for Smart Search keywords (e.g., "youtube cats").
        const queryParts = query.split(' ');
        const siteKeyword = queryParts[0].toLowerCase();
        
        if (siteSearchPatterns[siteKeyword] && queryParts.length > 1) {
            const siteUrl = new URL(siteSearchPatterns[siteKeyword]);
            const searchTerms = queryParts.slice(1).join(' ');
            
            // Assuming the search pattern uses the first query param for the search term
            siteUrl.searchParams.set(siteUrl.searchParams.keys().next().value, searchTerms);
            
            trackSiteVisit(siteUrl.origin + '/'); // Track the base domain
            renderSmartGrid(); // Update grid in background
            window.location.href = siteUrl.href;
            return;
        }

        // 3. If all else fails, perform a standard Google search.
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    });

    if (voiceSearchBtn) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';

            recognition.onresult = function(event) {
                const query = event.results[0][0].transcript;
                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            };
            recognition.onend = function() {
                voiceSearchBtn.classList.remove('listening');
            };
            recognition.onerror = function(event) {
                alert('Sorry, there was an error with the voice recognition.');
                voiceSearchBtn.classList.remove('listening');
            };

            voiceSearchBtn.addEventListener('click', function(event) {
                event.preventDefault();
                recognition.start();
                voiceSearchBtn.classList.add('listening');
            });
        } else {
            voiceSearchBtn.addEventListener('click', function(event) {
                event.preventDefault();
                alert('Sorry, your browser does not support voice search.');
            });
        }
    }
    
    const incognitoBtn = document.getElementById('incognito-btn');
    if (incognitoBtn) {
        incognitoBtn.addEventListener('click', function(event) {
            event.preventDefault();
            window.open('about:blank', '_blank');
        });
    }

    // --- I. INITIALIZE PAGE ---
    getHiddenSites();
    loadSettings();
    visiblePillCount = localStorage.getItem('homepage_pill_count') || 6;
    if (pillsSlider) pillsSlider.value = visiblePillCount;
    renderSmartGrid();
});
