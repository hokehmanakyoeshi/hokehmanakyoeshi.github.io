function normalizeMyanmarText(text) {
    if (!text) return "";
    return text
        .replace(/[က-အ]်/g, "")
        .replace(/[\u102B-\u103E\u1056-\u1059]/g, "")
        .toLowerCase();
}

function isMatchWithNormalizedSequence(title, query) {
    if (!title || !query) return false;
    
    const normTitle = normalizeMyanmarText(title);
    const normQuery = normalizeMyanmarText(query);

    if (normQuery.length === 0) return false;

    if (normTitle.includes(normQuery)) {
        return true;
    }

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

// Global Shared Card Template Function (Search နှင့် New Feed နှစ်ခုစလုံးအတွက် တစ်ခုတည်းကို မျှဝေသုံးသည်)
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

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const selectedBookContainer = document.getElementById('selectedBookContainer');

    let loadedChunksCache = {};

    function toggleLoading(show) {
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }

    function loadScript(filePath) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${filePath}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = filePath;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${filePath}`));
            document.head.appendChild(script);
        });
    }

    async function handleSearch(rawQuery) {
        const query = rawQuery.trim();
        if (query.length === 0) {
            if (clearBtn) clearBtn.style.display = 'none';
            if (autocompleteDropdown) autocompleteDropdown.style.display = 'none';
            return;
        }

        if (clearBtn) clearBtn.style.display = 'flex';
        toggleLoading(true);

        const normalizedQuery = normalizeMyanmarText(query);

        try {
            if (typeof getRootBookIndex !== 'function') {
                await loadScript('main-book-index.js');
            }

            const rootIndices = getRootBookIndex();
            let matchedBooks = [];

            const firstChar = normalizedQuery.charAt(0);
            const targetRoot = rootIndices.find(r => r.key === firstChar);

            if (targetRoot) {
                await loadScript(targetRoot.file);
                
                const indexFileName = targetRoot.file.split('/').pop().replace('.js', '');
                const suffix = indexFileName.replace('book-index-', '');
                const indexFunctionName = `getBookIndex_${suffix}`;

                if (typeof window[indexFunctionName] === 'function') {
                    const subIndexEntries = window[indexFunctionName]();
                    
                    if (normalizedQuery.length >= 2) {
                        const relevantEntries = subIndexEntries.filter(entry => {
                            const normPrefix = normalizeMyanmarText(entry.prefix);
                            return normPrefix === normalizedQuery || normPrefix.startsWith(normalizedQuery) || normalizedQuery.startsWith(normPrefix);
                        });

                        for (const entry of relevantEntries) {
                            if (!loadedChunksCache[entry.chunk]) {
                                await loadScript(entry.chunk);
                                loadedChunksCache[entry.chunk] = true;
                            }

                            const chunkFileName = entry.chunk.split('/').pop().replace('.js', '');
                            const chunkKey = chunkFileName.replace('chunk-book-', '');
                            const chunkFunctionName = `getChunkBook_${chunkKey}`;

                            if (typeof window[chunkFunctionName] === 'function') {
                                const chunkData = window[chunkFunctionName]();
                                
                                const filtered = chunkData.filter(b => {
                                    const isTitleMatch = isMatchWithNormalizedSequence(b.title, query);
                                    const isAuthorMatch = isMatchWithNormalizedSequence(b.author || '', query);
                                    return isTitleMatch || isAuthorMatch;
                                });
                                matchedBooks = matchedBooks.concat(filtered);
                            }
                        }
                    }
                }
            }

            displayAutocompleteResults(matchedBooks);

        } catch (error) {
            console.error("Book Search Loading Error:", error);
            if (autocompleteDropdown) {
                autocompleteDropdown.innerHTML = `<div class="no-result">ရှာဖွေရာတွင် အမှားအယွင်းရှိပါသည်</div>`;
                autocompleteDropdown.style.display = 'block';
            }
        } finally {
            toggleLoading(false);
        }
    }

    function displayAutocompleteResults(matches) {
        if (!autocompleteDropdown) return;

        if (searchInput && searchInput.value.trim().length < 2) {
            autocompleteDropdown.style.display = 'none';
            return;
        }

        const uniqueMatches = Array.from(new Set(matches.map(m => m.bookId)))
            .map(bookId => matches.find(m => m.bookId === bookId))
            .slice(0, 10);

        if (uniqueMatches.length > 0) {
            autocompleteDropdown.innerHTML = uniqueMatches.map(m => `
                <div class="dropdown-item" data-bookid="${m.bookId}">
                    <img src="${m.cover || 'https://via.placeholder.com/32x44'}" class="dropdown-book-cover" alt="">
                    <div class="dropdown-meta">
                        <strong>${m.title}</strong>
                        <div class="dropdown-author">ရေးသားသူ: ${m.author || 'မသိရှိရပါ'}</div>
                    </div>
                </div>
            `).join('');
            autocompleteDropdown.style.display = 'block';
        } else {
            autocompleteDropdown.innerHTML = `<div class="no-result">စာအုပ် မတွေ့ရှိရပါ။</div>`;
            autocompleteDropdown.style.display = 'block';
        }
    }

    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            clearTimeout(searchTimeout);

            if (query.trim().length === 0) {
                if (clearBtn) clearBtn.style.display = 'none';
                if (autocompleteDropdown) autocompleteDropdown.style.display = 'none';
                if (selectedBookContainer) selectedBookContainer.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(() => {
                handleSearch(query);
            }, 250);
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (autocompleteDropdown) autocompleteDropdown.style.display = 'none';
            }, 200);
        });
    }

    if (autocompleteDropdown) {
        autocompleteDropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (item) {
                const bookId = item.getAttribute('data-bookid');
                
                let selectedBook = null;
                for (const chunkPath in loadedChunksCache) {
                    const chunkFileName = chunkPath.split('/').pop().replace('.js', '');
                    const chunkKey = chunkFileName.replace('chunk-book-', '');
                    const chunkFunctionName = `getChunkBook_${chunkKey}`;
                    if (typeof window[chunkFunctionName] === 'function') {
                        const found = window[chunkFunctionName]().find(b => b.bookId === bookId);
                        if (found) {
                            selectedBook = found;
                            break;
                        }
                    }
                }

                if (selectedBook && selectedBookContainer) {
                    selectedBookContainer.innerHTML = createBookCardHTML(selectedBook, true);
                    selectedBookContainer.style.display = 'block';
                    selectedBookContainer.scrollIntoView({ behavior: 'smooth' });
                }

                autocompleteDropdown.style.display = 'none';
                if (searchInput) searchInput.value = '';
                if (clearBtn) clearBtn.style.display = 'none';
            }
        });
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            if (autocompleteDropdown) autocompleteDropdown.style.display = 'none';
            if (selectedBookContainer) selectedBookContainer.style.display = 'none';
            searchInput.focus();
        });
    }
});
    
