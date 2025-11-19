document.addEventListener('DOMContentLoaded', function() {

    // --- A. HELPER FUNCTIONS (HAPTICS & RIPPLE) ---
    function triggerHaptic(pattern = [10]) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }

    setTimeout(() => {
        document.body.classList.remove('anim-load');
    }, 1000);

    function createRipple(event) {
        triggerHaptic(8);
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
    let sortableInstance = null;

    function seedDefaultData() {
        if (!localStorage.getItem('homepage_sites_data')) {
            const defaults = {
                "https://www.google.com": { name: "Google", url: "https://www.google.com", count: 50 },
                "https://www.youtube.com": { name: "YouTube", url: "https://www.youtube.com", count: 40 },
                "https://www.reddit.com": { name: "Reddit", url: "https://www.reddit.com", count: 30 },
                "https://www.amazon.com": { name: "Amazon", url: "https://www.amazon.com", count: 20 },
                "https://mail.google.com": { name: "Gmail", url: "https://mail.google.com", count: 15 },
                "https://www.wikipedia.org": { name: "Wikipedia", url: "https://www.wikipedia.org", count: 10 }
            };
            localStorage.setItem('homepage_sites_data', JSON.stringify(defaults));
        }
    }

    function getHiddenSites() {
        const stored = localStorage.getItem('homepage_hidden_sites');
        hiddenSites = stored ? JSON.parse(stored) : [];
    }

    function saveHiddenSites() {
        localStorage.setItem('homepage_hidden_sites', JSON.stringify(hiddenSites));
    }

    function trackSiteVisit(url) {
        const urlObj = new URL(url);
        const key = urlObj.origin;

        let sites = JSON.parse(localStorage.getItem('homepage_sites_data')) || {};

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

    function saveGridOrder() {
        const order = [];
        const cards = linksGrid.querySelectorAll('.link-card');
        cards.forEach(card => {
            order.push(card.dataset.url);
        });
        localStorage.setItem('homepage_sites_order', JSON.stringify(order));
    }

    function renderSmartGrid() {
        const sites = JSON.parse(localStorage.getItem('homepage_sites_data')) || {};
        const sitesArray = Object.values(sites);
        let candidateSites = sitesArray.filter(site => !hiddenSites.includes(site.url));
        const savedOrder = JSON.parse(localStorage.getItem('homepage_sites_order')) || [];
        let visibleSites = [];

        if (savedOrder.length > 0) {
            savedOrder.forEach(url => {
                const siteObj = candidateSites.find(s => s.url === url);
                if (siteObj) visibleSites.push(siteObj);
            });
            const remaining = candidateSites.filter(s => !savedOrder.includes(s.url)).sort((a, b) => b.count - a.count);
            visibleSites = [...visibleSites, ...remaining];
        } else {
            visibleSites = candidateSites.sort((a, b) => b.count - a.count);
        }

        visibleSites = visibleSites.slice(0, visiblePillCount);

        if (linksGrid) {
            linksGrid.innerHTML = '';
            visibleSites.forEach((site, index) => {
                const linkCard = document.createElement('div');
                linkCard.className = 'link-card stagger-load';
                linkCard.style.animationDelay = `${200 + (index * 50)}ms`;
                linkCard.dataset.url = site.url;
                linkCard.dataset.name = site.name;
                linkCard.innerHTML = `
                    <div class="link-card-content">
                        <div class="icon-container">
                            <img src="https://www.google.com/s2/favicons?domain=${site.url}&sz=64" alt="${site.name}">
                        </div>
                        <span>${site.name}</span>
                        <button class="delete-btn" aria-label="Hide ${site.name}">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>`;
                linksGrid.appendChild(linkCard);
            });

            const addBtn = document.createElement('div');
            addBtn.className = 'link-card stagger-load';
            addBtn.style.animationDelay = `${200 + (visibleSites.length * 50)}ms`;
            addBtn.innerHTML = `<button class="add-favorite-btn" aria-label="Add Shortcut"><span class="material-symbols-outlined">add</span></button>`;
            linksGrid.appendChild(addBtn);

            document.querySelectorAll('.link-card-content, .add-favorite-btn').forEach(elem => elem.addEventListener('mousedown', createRipple));
            initSortable();
        }
    }

    function initSortable() {
        if (typeof Sortable === 'undefined' || !linksGrid) return;
        if (sortableInstance) sortableInstance.destroy();
        sortableInstance = new Sortable(linksGrid, {
            animation: 150,
            filter: '.add-favorite-btn',
            draggable: '.link-card',
            disabled: !document.body.classList.contains('edit-mode'),
            onEnd: function(evt) { saveGridOrder(); }
        });
    }

    // --- E. SEARCH SUGGESTIONS (JSONP) ---
    const suggestionsBox = document.getElementById('suggestions-box');
    let debounceTimer;

    function debounce(func, delay) {
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            const query = e.target.value.trim();
            if (query.length < 1) {
                hideSuggestions();
                return;
            }
            fetchSuggestions(query);
        }, 200));
    }

    function fetchSuggestions(query) {
        const scriptId = 'suggestion-script';
        const oldScript = document.getElementById(scriptId);
        if (oldScript) oldScript.remove();

        window.handleGoogleSuggestions = function(data) {
            if (data && data[1]) {
                renderSuggestions(data[1]);
            }
        };

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}&callback=handleGoogleSuggestions`;
        document.body.appendChild(script);
    }

    function renderSuggestions(results) {
        if (!results || results.length === 0) {
            hideSuggestions();
            return;
        }
        const topResults = results.slice(0, 5);
        let html = '';
        topResults.forEach(item => {
            html += `<div class="suggestion-item">${item}</div>`;
        });
        if (suggestionsBox) {
            suggestionsBox.innerHTML = html;
            suggestionsBox.classList.remove('hidden');
            document.querySelector('.search-section').classList.add('search-open');
        }
    }

    function hideSuggestions() {
        if (suggestionsBox) {
            suggestionsBox.classList.add('hidden');
            suggestionsBox.innerHTML = '';
            const sec = document.querySelector('.search-section');
            if (sec) sec.classList.remove('search-open');
        }
    }

    if (suggestionsBox) {
        suggestionsBox.addEventListener('click', function(e) {
            if (e.target.classList.contains('suggestion-item')) {
                const text = e.target.textContent;
                searchInput.value = text;
                hideSuggestions();
                triggerHaptic(10);
                searchForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (searchForm && !searchForm.contains(e.target) && suggestionsBox && !suggestionsBox.contains(e.target)) {
            hideSuggestions();
        }
    });

    // --- G. SETTINGS & GRID INTERACTION ---
    let sliderInitialized = false;

    function openSettings() {
        if (!sliderInitialized && pillsSlider) {
            buildTicks();
            sliderInitialized = true;
        }
        if (pillsSlider) updateSliderUI();
        renderHiddenSitesList();
        document.body.classList.add('settings-open');
    }

    function closeSettings() {
        document.body.classList.remove('settings-open');
    }

    function renderHiddenSitesList() {
        if (!hiddenSitesList) return;
        hiddenSitesList.innerHTML = '';
        if (hiddenSites.length > 0) {
            hiddenSitesGroup.classList.remove('hidden');
            hiddenSites.forEach(url => {
                const row = document.createElement('div');
                row.className = 'hidden-site-row';
                let hostname;
                try { hostname = new URL(url).hostname; } catch (e) { hostname = url; }
                row.innerHTML = `<span>${hostname}</span><button class="unhide-btn" data-url="${url}">Unhide</button>`;
                hiddenSitesList.appendChild(row);
            });
        } else {
            hiddenSitesGroup.classList.add('hidden');
        }
    }

    if (hiddenSitesList) {
        hiddenSitesList.addEventListener('click', (e) => {
            if (e.target.classList.contains('unhide-btn')) {
                triggerHaptic(5);
                const urlToUnhide = e.target.dataset.url;
                hiddenSites = hiddenSites.filter(url => url !== urlToUnhide);
                saveHiddenSites();
                renderHiddenSitesList();
                renderSmartGrid();
            }
        });
    }

    if (linksGrid) {
        linksGrid.addEventListener('click', function(e) {
            const target = e.target;
            const deleteButton = target.closest('.delete-btn');
            const addButton = target.closest('.add-favorite-btn');
            const linkContent = target.closest('.link-card-content');

            if (document.body.classList.contains('edit-mode')) {
                if (deleteButton) {
                    e.stopPropagation();
                    triggerHaptic([15]);
                    const linkCard = deleteButton.closest('.link-card');
                    const urlToHide = linkCard.dataset.url;
                    if (!hiddenSites.includes(urlToHide)) {
                        hiddenSites.push(urlToHide);
                        saveHiddenSites();
                        renderSmartGrid();
                    }
                }
                return;
            }

            if (addButton) {
                triggerHaptic(8);
                const url = prompt('Enter a website URL (e.g. youtube.com):');
                if (url) {
                    try {
                        let validUrl = url.trim();
                        if (!validUrl.startsWith('http')) {
                            validUrl = 'https://' + validUrl;
                        }
                        trackSiteVisit(validUrl);
                        renderSmartGrid();
                    } catch (e) {
                        alert('Invalid URL.');
                    }
                }
                return;
            }

            if (linkContent) {
                triggerHaptic(5);
                const linkCard = linkContent.closest('.link-card');
                trackSiteVisit(linkCard.dataset.url);
                window.location.href = linkCard.dataset.url;
            }
        });
    }

    // --- H. SLIDER & INITIALIZATION ---
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

    editFavoritesFab.addEventListener('click', () => {
        triggerHaptic([15]);
        const isEditing = document.body.classList.toggle('edit-mode');
        editFavoritesFab.classList.toggle('active', isEditing);
        const icon = editFavoritesFab.querySelector('.material-symbols-outlined');
        icon.textContent = isEditing ? 'done' : 'edit';
        if (sortableInstance) sortableInstance.option("disabled", !isEditing);
    });

    settingsToggleBtn.addEventListener('click', () => { triggerHaptic(8); openSettings(); });
    settingsCloseBtn.addEventListener('click', () => { triggerHaptic(8); closeSettings(); });
    settingsOverlay.addEventListener('click', closeSettings);

    const settingRows = document.querySelectorAll('.switch-row');
    settingRows.forEach(row => {
        row.addEventListener('click', function(event) {
            triggerHaptic(5);
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
            if (targetButton) targetButton.classList.toggle('hidden', !toggle.checked);
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

    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;

        if (query.includes('.') || query.includes('://')) {
            try {
                let finalUrl = query;
                if (!query.includes('://')) finalUrl = `https://${query}`;
                const url = new URL(finalUrl);
                trackSiteVisit(url.href);
                renderSmartGrid();
                window.location.href = url.href;
                return;
            } catch (e) { }
        }

        const queryParts = query.split(' ');
        const siteKeyword = queryParts[0].toLowerCase();
        if (siteSearchPatterns[siteKeyword] && queryParts.length > 1) {
            const siteUrl = new URL(siteSearchPatterns[siteKeyword]);
            const searchTerms = queryParts.slice(1).join(' ');
            const keys = Array.from(siteUrl.searchParams.keys());
            if (keys.length > 0) siteUrl.searchParams.set(keys[0], searchTerms);
            trackSiteVisit(siteUrl.origin);
            renderSmartGrid();
            window.location.href = siteUrl.href;
            return;
        }
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
            recognition.onend = function() { voiceSearchBtn.classList.remove('listening'); };
            recognition.onerror = function(event) { voiceSearchBtn.classList.remove('listening'); };
            voiceSearchBtn.addEventListener('click', function(event) {
                event.preventDefault();
                recognition.start();
                voiceSearchBtn.classList.add('listening');
            });
        } else {
            voiceSearchBtn.addEventListener('click', function(event) {
                event.preventDefault();
                alert('Voice search not supported in this browser.');
            });
        }
    }

    // Init
    seedDefaultData();
    getHiddenSites();
    loadSettings();
    visiblePillCount = localStorage.getItem('homepage_pill_count') || 6;
    if (pillsSlider) pillsSlider.value = visiblePillCount;
    renderSmartGrid();
});
