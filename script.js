document.addEventListener('DOMContentLoaded', function() {

    // --- A. ON PAGE LOAD ---
    setTimeout(() => { document.body.classList.remove('anim-load'); }, 1000);

    // --- B. RIPPLE EFFECT LOGIC ---
    function createRipple(event) {
        if (event.target.closest('.delete-btn')) {
            return;
        }
        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
        circle.classList.add("ripple");
        const ripple = button.getElementsByClassName("ripple")[0];
        if (ripple) {
            ripple.remove();
        }
        button.appendChild(circle);
    }

    // --- C. DOM Element Selections ---
    const linksGrid = document.getElementById('links-grid');
    const editFavoritesFab = document.getElementById('edit-favorites-fab');
    const suggestionGrid = document.getElementById('suggestion-grid');
    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');
    const settingsCloseBtn = document.getElementById('settings-close-btn');

    // --- D. FAVORITES & SITE DATA MANAGEMENT ---
    let favorites = [];
    const defaultFavorites = [{ name: 'OneNote', url: 'https://www.onenote.com' }, { name: 'News', url: 'https://news.google.com' }, { name: 'GitHub', url: 'https://www.github.com' }, { name: 'Gemini', url: 'https://gemini.google.com' }, { name: 'Reddit', url: 'https://www.reddit.com' }, { name: 'Twitter', url: 'https://www.twitter.com' }];
    function getFavorites() {
        const storedFavorites = localStorage.getItem('homepage_favorites');
        favorites = storedFavorites ? JSON.parse(storedFavorites) : defaultFavorites;
    }
    function saveFavorites() { localStorage.setItem('homepage_favorites', JSON.stringify(favorites)); }

    function renderFavorites() {
        linksGrid.innerHTML = '';
        favorites.forEach((fav) => {
            const linkCard = document.createElement('div');
            linkCard.className = 'link-card';
            linkCard.dataset.url = fav.url;
            linkCard.dataset.name = fav.name;
            linkCard.innerHTML = `<div class="link-card-content"><div class="icon-container"><img src="https://www.google.com/s2/favicons?domain=${fav.url}&sz=64" alt=""></div><span>${fav.name}</span><button class="delete-btn" aria-label="Delete ${fav.name}"><span class="material-symbols-outlined">close</span></button></div>`;
            linksGrid.appendChild(linkCard);
        });
        const addBtn = document.createElement('button');
        addBtn.className = 'add-favorite-btn';
        addBtn.innerHTML = `<span class="material-symbols-outlined">add</span>`;
        linksGrid.appendChild(addBtn);
        document.querySelectorAll('.link-card-content, .add-favorite-btn, .fab, #settings-close-btn, .switch-row').forEach(elem => elem.addEventListener("mousedown", createRipple));
    }

    function addFavorite() {
        const url = prompt("Enter the full URL of the website to add:");
        if (url) {
            try {
                const urlObj = new URL(url);
                let name = urlObj.hostname.replace('www.', '').split('.')[0];
                name = name.charAt(0).toUpperCase() + name.slice(1);
                favorites.push({ name, url });
                saveFavorites();
                renderFavorites();
                trackSiteVisit(url);
                renderSuggestions();
            } catch (e) {
                alert("Invalid URL.");
            }
        }
    }
    function deleteFavorite(name) {
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
            favorites = favorites.filter(fav => fav.name !== name);
            saveFavorites();
            renderFavorites();
            renderSuggestions();
        }
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
            sites[key] = { name: name, url: key, count: 1 };
        }
        localStorage.setItem('homepage_sites_data', JSON.stringify(sites));
    }

    function renderSuggestions() {
        const sites = JSON.parse(localStorage.getItem('homepage_sites_data')) || {};
        const suggestionSection = document.getElementById('suggestion-section');
        const sitesArray = Object.values(sites);

        sitesArray.sort((a, b) => b.count - a.count);
        const suggestions = sitesArray.slice(0, 4);

        suggestionGrid.innerHTML = '';

        if (suggestions.length === 0) {
            suggestionSection.classList.add('hidden');
            return;
        }

        suggestionSection.classList.remove('hidden');
        suggestions.forEach(site => {
            const chip = document.createElement('a');
            chip.href = site.url;
            chip.className = 'suggestion-chip';
            chip.innerHTML = `<div class="icon-container"><img src="https://www.google.com/s2/favicons?domain=${site.url}&sz=64" alt=""></div><span>${site.name}</span>`;

            chip.addEventListener('click', (e) => {
                trackSiteVisit(e.currentTarget.href);
            });
            suggestionGrid.appendChild(chip);
        });
    }

    // --- E. DRAG-AND-DROP & MASTER CLICK HANDLER ---
    new Sortable(linksGrid, { animation: 250, filter: '.add-favorite-btn', ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', onEnd: function() { const newOrder = []; linksGrid.querySelectorAll('.link-card').forEach(card => { newOrder.push({ name: card.dataset.name, url: card.dataset.url }); }); favorites = newOrder; saveFavorites(); } });

    linksGrid.addEventListener('click', function(e) {
        const target = e.target;
        const deleteButton = target.closest('.delete-btn');
        const addButton = target.closest('.add-favorite-btn');
        const linkContent = target.closest('.link-card-content');
        if (deleteButton) { const linkCard = deleteButton.closest('.link-card'); deleteFavorite(linkCard.dataset.name); return; }
        if (addButton) { addFavorite(); return; }
        if (linkContent && !document.body.classList.contains('edit-mode')) {
            const linkCard = linkContent.closest('.link-card');
            trackSiteVisit(linkCard.dataset.url); // Track clicks on favorites
            window.location.href = linkCard.dataset.url;
        }
    });

    // --- F. SETTINGS & EDIT MODE LOGIC ---
    editFavoritesFab.addEventListener('click', () => {
        const isEditing = document.body.classList.toggle('edit-mode');
        editFavoritesFab.classList.toggle('active', isEditing);
        const icon = editFavoritesFab.querySelector('.material-symbols-outlined');
        icon.textContent = isEditing ? 'done' : 'edit';
    });

    function openSettings() {
        document.body.classList.add('settings-open');
    }
    function closeSettings() {
        if (document.body.classList.contains('edit-mode')) {
            document.body.classList.remove('edit-mode');
            editFavoritesFab.classList.remove('active');
            editFavoritesFab.querySelector('.material-symbols-outlined').textContent = 'edit';
        }
        document.body.classList.remove('settings-open');
    }
    settingsToggleBtn.addEventListener('click', openSettings);
    settingsCloseBtn.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);
    const actionButtonToggles = document.querySelectorAll('.action-button-toggle');
    const iconStyleToggle = document.getElementById('icon-style-toggle');
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

            // --- THE CORE LOGIC ---
            if (checkedToggles.length > 3) {
                alert("You can only select a maximum of 3 buttons.");
                // Uncheck the box the user just clicked
                toggle.checked = false; 
                return; // Stop the function
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
        // Check if any settings exist. If not, set the default three.
        const hasSettings = !!localStorage.getItem('setting_visibility_incognito-btn');

        actionButtonToggles.forEach(toggle => {
            const targetId = toggle.dataset.targetId;
            let isVisible;

            if (hasSettings) {
                isVisible = localStorage.getItem(`setting_visibility_${targetId}`) === 'true';
            } else {
                // Default state for first-time load
                isVisible = (targetId === 'incognito-btn' || targetId === 'mic-btn' || targetId === 'lens-btn');
            }

            toggle.checked = isVisible;
            document.getElementById(targetId)?.classList.toggle('hidden', !isVisible);
        });

        const iconStyle = localStorage.getItem('setting_iconStyle') || 'outlined';
        iconStyleToggle.checked = iconStyle === 'filled';
        document.body.classList.toggle('icons-filled', iconStyle === 'filled');
    }

    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    searchForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
            let url;
            let isUrl = false;
            try {
                url = new URL(query);
                isUrl = true;
            }
            catch (_) {
                if (query.includes('.') && !query.includes(' ')) {
                    url = `https://${query}`;
                    isUrl = true;
                }
                else {
                    url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                }
            }

            if (isUrl) {
                trackSiteVisit(url.toString());
                renderSuggestions();
            }
            window.location.href = url;
        }
    });

    const voiceSearchBtn = document.getElementById('mic-btn');
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
                alert("Sorry, there was an error with the voice recognition.");
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
                alert("Sorry, your browser does not support voice search.");
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

    // --- G. INITIALIZE PAGE ---
    getFavorites();
    renderFavorites();
    renderSuggestions();
    loadSettings();
});
