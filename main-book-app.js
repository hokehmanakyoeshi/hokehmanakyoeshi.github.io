/**
 * Book Application Core & Search System
 */
(() => {
    'use strict';

    // --- Utility Functions ---
    const MyanmarUtils = {
        normalizeText(text) {
            if (!text) return "";
            return text
                .replace(/[က-အ]်/g, "")
                .replace(/[\u102B-\u103E\u1056-\u1059]/g, "")
                .toLowerCase();
        },

        isMatchSequence(title, query) {
            if (!title || !query) return false;
            
            const normTitle = this.normalizeText(title);
            const normQuery = this.normalizeText(query);

            if (normQuery.length === 0) return false;
            if (normTitle.includes(normQuery)) return true;

            let titleIdx = 0;
            let queryIdx = 0;

            while (titleIdx < normTitle.length && queryIdx < normQuery.length) {
                if (normTitle[titleIdx] === normQuery[queryIdx]) {
                    queryIdx++;
                }
                titleIdx++;
            }

            return queryIdx === normQuery.length;
        }
    };

    // --- Shared Script Loader (Centralized) ---
    const loadedScriptsCache = {};
    function loadScript(filePath) {
        if (loadedScriptsCache[filePath]) {
            return loadedScriptsCache[filePath];
        }

        loadedScriptsCache[filePath] = new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${filePath}"]`)) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = filePath;
            script.onload = () => resolve(true);
            script.onerror = () => {
                delete loadedScriptsCache[filePath];
                reject(new Error(`Failed to load script: ${filePath}`));
            };
            document.head.appendChild(script);
        });

        return loadedScriptsCache[filePath];
    }

    // --- Card Template Component ---
    function createBookCardHTML(book, isSelected = false) {
        const readersHTML = book.readers && book.readers.length > 0
            ? book.readers.map(r => `<li class="book-tag">👤 ${r.displayName} (@${r.username})</li>`).join('')
            : '<li class="book-tag muted">ဖတ်ရှုသူမရှိသေးပါ။</li>';

        const cardClass = isSelected ? 'profile-card selected-highlight-card' : 'profile-card newfeed-card';
        const badgeHTML = isSelected ? '<div class="card-top-badge">ရွေးချယ်ထားသော စာအုပ်</div>' : '';

        return `
            <div class="${cardClass}">
                ${badgeHTML}
                <div class="book-card-layout">
                    <img src="${book.cover || 'https://via.placeholder.com/65x90'}" alt="${book.title}" class="book-cover">
                    <div class="book-info-area">
                        <h3 class="book-title-heading">${book.title}</h3>
                        <p class="book-author-text">ရေးသားသူ: ${book.author || 'မသိရှိရပါ'}</p>
                        <p class="card-bio">${book.description || ''}</p>
                    </div>
                </div>
                <div class="card-books">
                    <h4>ဖတ်ရှုထားသူများ:</h4>
                    <ul class="books-list">${readersHTML}</ul>
                </div>
            </div>
        `;
    }

    // Expose Global Helpers for other modules
    window.BookAppCore = {
        normalizeText: MyanmarUtils.normalizeText,
        isMatchSequence: MyanmarUtils.isMatchSequence,
        loadScript,
        createBookCardHTML
    };

    // --- Search Module Initialization ---
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

            const normalizedQuery = MyanmarUtils.normalizeText(query);

            try {
                if (typeof getRootBookIndex !== 'function') {
                    await loadScript('main-book-index.js');
                }

                const rootIndices = getRootBookIndex();
                if (!rootIndices) return;

                const firstChar = normalizedQuery.charAt(0);
                const targetRoot = rootIndices.find(r => r.key === firstChar);
                let matchedBooks = [];

                if (targetRoot) {
                    await loadScript(targetRoot.file);
                    const suffix = targetRoot.file.split('/').pop().replace('.js', '').replace('book-index-', '');
                    const indexFuncName = `getBookIndex_${suffix}`;

                    if (typeof window[indexFuncName] === 'function') {
                        const subIndexEntries = window[indexFuncName]();
                        
                        if (normalizedQuery.length >= 2) {
                            const relevantEntries = subIndexEntries.filter(entry => {
                                const normPrefix = MyanmarUtils.normalizeText(entry.prefix);
                                return normPrefix === normalizedQuery || normPrefix.startsWith(normalizedQuery) || normalizedQuery.startsWith(normPrefix);
                            });

                            for (const entry of relevantEntries) {
                                if (!loadedChunks[entry.chunk]) {
                                    await loadScript(entry.chunk);
                                    loadedChunks[entry.chunk] = true;
                                }

                                const chunkKey = entry.chunk.split('/').pop().replace('.js', '').replace('chunk-book-', '');
                                const chunkFunc = `getChunkBook_${chunkKey}`;

                                if (typeof window[chunkFunc] === 'function') {
                                    const chunkData = window[chunkFunc]();
                                    const filtered = chunkData.filter(b => 
                                        MyanmarUtils.isMatchSequence(b.title, query) || 
                                        MyanmarUtils.isMatchSequence(b.author || '', query)
                                    );
                                    matchedBooks = matchedBooks.concat(filtered);
                                }
                            }
                        }
                    }
                }

                renderDropdown(matchedBooks);
            } catch (error) {
                console.error("Search Error:", error);
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
            if (elements.search && elements.search.value.trim().length < 2) {
                elements.dropdown.style.display = 'none';
                return;
            }

            const uniqueMatches = Array.from(new Set(matches.map(m => m.bookId)))
                .map(id => matches.find(m => m.bookId === id))
                .slice(0, 10);

            if (uniqueMatches.length > 0) {
                elements.dropdown.innerHTML = uniqueMatches.map(m => `
                    <div class="dropdown-item" data-bookid="${m.bookId}">
                        <img src="${m.cover || 'https://via.placeholder.com/32x44'}" class="dropdown-book-cover" alt="">
                        <div class="dropdown-meta">
                            <strong>${m.title}</strong>
                            <div class="dropdown-author">ရေးသားသူ: ${m.author || 'မသိရှိရပါ'}</div>
                        </div>
                    </div>
                `).join('');
                elements.dropdown.style.display = 'block';
            } else {
                elements.dropdown.innerHTML = `<div class="no-result">စာအုပ် မတွေ့ရှိရပါ။</div>`;
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

                const bookId = item.getAttribute('data-bookid');
                let selectedBook = null;

                for (const chunkPath in loadedChunks) {
                    const chunkKey = chunkPath.split('/').pop().replace('.js', '').replace('chunk-book-', '');
                    const chunkFunc = `getChunkBook_${chunkKey}`;
                    if (typeof window[chunkFunc] === 'function') {
                        const found = window[chunkFunc]().find(b => b.bookId === bookId);
                        if (found) {
                            selectedBook = found;
                            break;
                        }
                    }
                }

                if (selectedBook && elements.selectedContainer) {
                    elements.selectedContainer.innerHTML = createBookCardHTML(selectedBook, true);
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
