document.addEventListener('DOMContentLoaded', function() {

    // --- A. ON PAGE LOAD ---
    setTimeout(() => { document.body.classList.remove('anim-load'); }, 1000);

    // --- B. RIPPLE EFFECT LOGIC ---
    function createRipple(event) {
        // --- THIS IS THE DEFINITIVE FIX ---
        // If the click started on a delete button, DO NOT create a ripple.
        if (event.target.closest('.delete-btn')) {
            return;
        }
        // --- END OF FIX ---

        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
        circle.classList.add("ripple");
        const ripple = button.getElementsByClassName("ripple")[0];
        if (ripple) { ripple.remove(); }
        button.appendChild(circle);
    }

    // --- C. DOM Element Selections ---
    const linksGrid = document.getElementById('links-grid');
    const editFavoritesFab = document.getElementById('edit-favorites-fab');

    // --- D. FAVORITES MANAGEMENT ---
    let favorites = [];
    const defaultFavorites = [
        { name: 'OneNote', url: 'https://www.onenote.com' }, { name: 'News', url: 'https://news.google.com' },
        { name: 'GitHub', url: 'https://www.github.com' }, { name: 'Gemini', url: 'https://gemini.google.com' },
        { name: 'Reddit', url: 'https://www.reddit.com' }, { name: 'Twitter', url: 'https://www.twitter.com' }
    ];

    function getFavorites() { const storedFavorites = localStorage.getItem('homepage_favorites'); favorites = storedFavorites ? JSON.parse(storedFavorites) : defaultFavorites; }
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

    function addFavorite() { const url = prompt("Enter the full URL of the website to add:"); if (url) { try { const urlObj = new URL(url); let name = urlObj.hostname.replace('www.', '').split('.')[0]; name = name.charAt(0).toUpperCase() + name.slice(1); favorites.push({ name, url }); saveFavorites(); renderFavorites(); } catch (e) { alert("Invalid URL."); } } }

    function deleteFavorite(name) {
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
            favorites = favorites.filter(fav => fav.name !== name);
            saveFavorites();
            renderFavorites();
        }
    }

    // --- E. DRAG-AND-DROP INITIALIZATION ---
    new Sortable(linksGrid, {
        animation: 250, // Animation speed
        filter: '.add-favorite-btn', // The 'Add' button should not be draggable
        ghostClass: 'sortable-ghost', // The class for the placeholder
        chosenClass: 'sortable-chosen', // The class for the item being dragged

        // This function runs when you finish dragging
        onEnd: function () {
            const newOrder = [];
            // Read the new order of elements directly from the page
            linksGrid.querySelectorAll('.link-card').forEach(card => {
                newOrder.push({
                    name: card.dataset.name,
                    url: card.dataset.url
                });
            });
            // Update the main favorites array and save it
            favorites = newOrder;
            saveFavorites();
        }
    });

    // --- E. MASTER CLICK HANDLER ---
    linksGrid.addEventListener('click', function(e) {
        const target = e.target;
        const deleteButton = target.closest('.delete-btn');
        const addButton = target.closest('.add-favorite-btn');
        const linkContent = target.closest('.link-card-content');

        if (deleteButton) {
            const linkCard = deleteButton.closest('.link-card');
            deleteFavorite(linkCard.dataset.name);
            return;
        }
        if (addButton) {
            addFavorite();
            return;
        }
        if (linkContent && !document.body.classList.contains('edit-mode')) {
            const linkCard = linkContent.closest('.link-card');
            window.location.href = linkCard.dataset.url;
        }
    });

    // --- F. SETTINGS & EDIT MODE LOGIC ---
    editFavoritesFab.addEventListener('click', () => { const isEditing = document.body.classList.toggle('edit-mode'); editFavoritesFab.classList.toggle('active', isEditing); const icon = editFavoritesFab.querySelector('.material-symbols-outlined'); icon.textContent = isEditing ? 'done' : 'edit'; });

    // All other settings logic remains here, unchanged
    const settingsToggleBtn = document.getElementById('settings-toggle-btn'); const settingsPanel = document.getElementById('settings-panel'); const settingsOverlay = document.getElementById('settings-overlay'); const settingsCloseBtn = document.getElementById('settings-close-btn');
    function openSettings() { document.body.classList.add('settings-open'); }
    function closeSettings() { if (document.body.classList.contains('edit-mode')) { document.body.classList.remove('edit-mode'); editFavoritesFab.classList.remove('active'); editFavoritesFab.querySelector('.material-symbols-outlined').textContent = 'edit'; } document.body.classList.remove('settings-open'); }
    settingsToggleBtn.addEventListener('click', openSettings); settingsCloseBtn.addEventListener('click', closeSettings); settingsOverlay.addEventListener('click', closeSettings);
    const actionButtonToggles = document.querySelectorAll('input[type="checkbox"][data-target-id]'); const iconStyleToggle = document.getElementById('icon-style-toggle'); const settingRows = document.querySelectorAll('.switch-row'); settingRows.forEach(row => { row.addEventListener('click', function(event) { const input = row.querySelector('input'); if (input && event.target.tagName !== 'INPUT') { input.click(); } }); });     actionButtonToggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            // THIS LINE IS NOW CORRECT
            const targetId = toggle.dataset.targetId; 
            const targetButton = document.getElementById(targetId);
            if (targetButton) {
                targetButton.classList.toggle('hidden', !toggle.checked);
            }
            // This also fixes the localStorage saving
            localStorage.setItem(`setting_visibility_${targetId}`, toggle.checked);
        });
    }); iconStyleToggle.addEventListener('change', () => { document.body.classList.toggle('icons-filled', iconStyleToggle.checked); localStorage.setItem('setting_iconStyle', iconStyleToggle.checked ? 'filled' : 'outlined'); });
    function loadSettings() { actionButtonToggles.forEach(toggle => { const targetId = toggle.dataset.targetId; const isVisible = localStorage.getItem(`setting_visibility_${targetId}`) !== 'false'; toggle.checked = isVisible; document.getElementById(targetId)?.classList.toggle('hidden', !isVisible); }); const iconStyle = localStorage.getItem('setting_iconStyle') || 'outlined'; iconStyleToggle.checked = iconStyle === 'filled'; document.body.classList.toggle('icons-filled', iconStyle === 'filled');}
    const searchForm = document.getElementById('search-form'); const searchInput = document.getElementById('search-input'); searchForm.addEventListener('submit', function(event) { event.preventDefault(); const query = searchInput.value.trim(); if (query) { let url; try { url = new URL(query); } catch (_) { if (query.includes('.') && !query.includes(' ')) { url = `https://${query}`; } else { url = `https://www.google.com/search?q=${encodeURIComponent(query)}`; } } window.location.href = url; } });
    const voiceSearchBtn = document.getElementById('mic-btn');
    if (voiceSearchBtn) {
        // Check if the browser supports the Web Speech API
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';

            // This runs when speech is successfully converted to text
            recognition.onresult = function(event) {
                const query = event.results[0][0].transcript;
                // Automatically perform the Google search
                window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            };

            // This runs when the listening ends (after you stop talking)
            recognition.onend = function() {
                voiceSearchBtn.classList.remove('listening');
            };

            recognition.onerror = function(event) {
                alert("Sorry, there was an error with the voice recognition.");
                voiceSearchBtn.classList.remove('listening');
            };

            // The main click event
            voiceSearchBtn.addEventListener('click', function(event) {
                event.preventDefault();
                // Start listening and add the pulsing animation class
                recognition.start();
                voiceSearchBtn.classList.add('listening');
            });

        } else {
            // If the browser doesn't support the API, clicking the button will alert the user.
            voiceSearchBtn.addEventListener('click', function(event) {
                event.preventDefault();
                alert("Sorry, your browser does not support voice search.");
            });
        }
    }
    const incognitoBtn = document.getElementById('incognito-btn'); if (incognitoBtn) { incognitoBtn.addEventListener('click', function(event) { event.preventDefault(); window.open('about:blank', '_blank'); }); }

    // --- G. INITIALIZE PAGE ---
    getFavorites();
    renderFavorites();
    loadSettings();
});
