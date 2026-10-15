/**
 * Profile Application Core & Search System
 */
(() => {
    'use strict';

    // Reuse MyanmarUtils or BookAppCore if available, else fallback
    const Utils = window.BookAppCore || {
        normalizeText(text) {
            if (!text) return "";
            return text.replace(/[က-အ]်/g, "").replace(/[\u102B-\u103E\u1056-\u1059]/g, "").toLowerCase();
        },
        isMatchSequence(title, query) {
            if (!title || !query) return false;
            const normTitle = this.normalizeText(title);
            const normQuery = this.normalizeText(query);
            return normTitle.includes(normQuery);
        },
        loadScript(filePath) {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${filePath}"]`)) { resolve(true); return; }
                const s = document.createElement('script');
                s.src = filePath;
                s.onload = () => resolve(true);
                s.onerror = () => reject(new Error(`Failed: ${filePath}`));
                document.head.appendChild(s);
            });
        }
    };

    // --- Profile Card Template HTML Generator ---
    function createProfileCardHTML(profile, isSelected = false) {
        const interestsHTML = profile.interests && profile.interests.length > 0
            ? profile.interests.map(i => `<li class="book-tag">🏷️ ${i}</li>`).join('')
            : '<li class="book-tag muted">ចំណាប់လည်မှု မရှိသေးပါ။</li>';

        const cardClass = isSelected ? 'profile-card selected-highlight-card' : 'profile-card newfeed-card';
        const badgeHTML = isSelected ? '<div class="card-top-badge">ရွေးချယ်ထားသော ပရိုဖိုင်</div>' : '';

        return `
            <div class="${cardClass}">
                ${badgeHTML}
                <div class="book-card-layout">
                    <img src="${profile.avatar || 'https://via.placeholder.com/65x90/111111/C49102?text=User'}" alt="${profile.displayName}" class="book-cover" style="border-radius: 50%;">
                    <div class="book-info-area">
                        <h3 class="book-title-heading">${profile.displayName}</h3>
                        <p class="book-author-text">Username: @${profile.username || 'unknown'}</p>
                        <p class="card-bio">${profile.bio || ''}</p>
                    </div>
                </div>
                <div class="card-books">
                    <h4>ចំណាប់လည်ရာ အဓိကအကြောင်းအရာများ:</h4>
                    <ul class="books-list">${interestsHTML}</ul>
                </div>
            </div>
        `;
    }

    // Expose Global Helpers
    window.ProfileAppCore = {
        ...Utils,
        createProfileCardHTML
    };

    // --- Profile Search Module Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
        const elements = {
            search: document.getElementById('searchInput'),
            clear: document.getElementById('clearBtn'),
            dropdown: document.getElementById('autocompleteDropdown'),
            loading: document.getElementById('loadingIndicator'),
            selectedContainer: document.getElementById('selectedBookContainer')
        };

        const loadedChunks = {};
        let searchTimeout = null;

        function toggleLoading(show) {
            if (elements.loading) {
                elements.loading.style.display = show ? 'flex' : 'none';
            }
        }

        async function handleSearch(rawQuery) {
            const query = rawQuery.trim();
            if (!query) return;

            if (elements.clear) elements.clear.style.display = 'flex';
            toggleLoading(true);

            const normalizedQuery = Utils.normalizeText(query);

            try {
                if (typeof getRootProfileIndex !== 'function') {
                    await Utils.loadScript('profile-indices/profile-index-root.js');
                }

                const rootIndices = getRootProfileIndex();
                if (!rootIndices) return;

                const firstChar = normalizedQuery.charAt(0);
                const targetRoot = rootIndices.find(r => r.key === firstChar);
                let matchedProfiles = [];

                if (targetRoot) {
                    await Utils.loadScript(targetRoot.file);
                    const suffix = targetRoot.file.split('/').pop().replace('.js', '').replace('profile-index-', '');
                    const indexFuncName = `getProfileIndex_${suffix}`;

                    if (typeof window[indexFuncName] === 'function') {
                        const subIndexEntries = window[indexFuncName]();
                        
                        for (const entry of subIndexEntries) {
                            if (!loadedChunks[entry.chunk]) {
                                await Utils.loadScript(entry.chunk);
                                loadedChunks[entry.chunk] = true;
                            }

                            const chunkKey = entry.chunk.split('/').pop().replace('.js', '').replace('chunk-profile-', '');
                            const chunkFunc = `getChunkProfile_${chunkKey}`;

                            if (typeof window[chunkFunc] === 'function') {
                                const chunkData = window[chunkFunc]();
                                const filtered = chunkData.filter(p => 
                                    Utils.isMatchSequence(p.displayName, query) || 
                                    Utils.isMatchSequence(p.username || '', query) ||
                                    Utils.isMatchSequence(p.bio || '', query)
                                );
                                matchedProfiles = matchedProfiles.concat(filtered);
                            }
                        }
                    }
                }

                renderDropdown(matchedProfiles);
            } catch (error) {
                console.error("Profile Search Error:", error);
                if (elements.dropdown) {
                    elements.dropdown.innerHTML = `<div class="no-result">ရှာဖွေရာတွင် အမှားအယွင်းရှိပါသည်</div>`;
                    elements.dropdown.style.display = 'block';
                }
            } finally {
                toggleLoading(false);
            }
        }

        function renderDropdown(matches) {
            if (!elements.dropdown) return;
            if (elements.search && elements.search.value.trim().length < 1) {
                elements.dropdown.style.display = 'none';
                return;
            }

            const uniqueMatches = Array.from(new Set(matches.map(m => m.userId)))
                .map(id => matches.find(m => m.userId === id))
                .slice(0, 10);

            if (uniqueMatches.length > 0) {
                elements.dropdown.innerHTML = uniqueMatches.map(m => `
                    <div class="dropdown-item" data-userid="${m.userId}">
                        <img src="${m.avatar || 'https://via.placeholder.com/32x32'}" class="dropdown-book-cover" alt="" style="border-radius: 50%;">
                        <div class="dropdown-meta">
                            <strong>${m.displayName}</strong>
                            <div class="dropdown-author">@${m.username}</div>
                        </div>
                    </div>
                `).join('');
                elements.dropdown.style.display = 'block';
            } else {
                elements.dropdown.innerHTML = `<div class="no-result">အသုံးပြုသူ မတွေ့ရှိရပါ။</div>`;
                elements.dropdown.style.display = 'block';
            }
        }

        // Event Listeners
        if (elements.search) {
            elements.search.addEventListener('input', (e) => {
                const query = e.target.value;
                clearTimeout(searchTimeout);

                if (!query.trim()) {
                    if (elements.clear) elements.clear.style.display = 'none';
                    if (elements.dropdown) elements.dropdown.style.display = 'none';
                    if (elements.selectedContainer) elements.selectedContainer.style.display = 'none';
                    return;
                }

                searchTimeout = setTimeout(() => handleSearch(query), 250);
            });

            elements.search.addEventListener('blur', () => {
                setTimeout(() => {
                    if (elements.dropdown) elements.dropdown.style.display = 'none';
                }, 200);
            });
        }

        if (elements.dropdown) {
            elements.dropdown.addEventListener('click', (e) => {
                const item = e.target.closest('.dropdown-item');
                if (!item) return;

                const userId = item.getAttribute('data-userid');
                let selectedProfile = null;

                for (const chunkPath in loadedChunks) {
                    const chunkKey = chunkPath.split('/').pop().replace('.js', '').replace('chunk-profile-', '');
                    const chunkFunc = `getChunkProfile_${chunkKey}`;
                    if (typeof window[chunkFunc] === 'function') {
                        const found = window[chunkFunc]().find(p => p.userId === userId);
                        if (found) {
                            selectedProfile = found;
                            break;
                        }
                    }
                }

                if (selectedProfile && elements.selectedContainer) {
                    elements.selectedContainer.innerHTML = createProfileCardHTML(selectedProfile, true);
                    elements.selectedContainer.style.display = 'block';
                    elements.selectedContainer.scrollIntoView({ behavior: 'smooth' });
                }

                elements.dropdown.style.display = 'none';
                if (elements.search) elements.search.value = '';
                if (elements.clear) elements.clear.style.display = 'none';
            });
        }

        if (elements.clear && elements.search) {
            elements.clear.addEventListener('click', () => {
                elements.search.value = '';
                elements.clear.style.display = 'none';
                if (elements.dropdown) elements.dropdown.style.display = 'none';
                if (elements.selectedContainer) elements.selectedContainer.style.display = 'none';
                elements.search.focus();
            });
        }
    });
})();
