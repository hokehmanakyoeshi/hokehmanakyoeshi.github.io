document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const selectedProfileContainer = document.getElementById('selectedProfileContainer');

    // ပြီးသွားသော chunk များကို မှတ်ထားရန် Cache (Memory ထဲတွင် တခါ load ပြီးသားဆိုလျှင် နောက်တစ်ခါ ထပ်မခေါ်တော့ပါ)
    let loadedChunksCache = {};

    function toggleLoading(show) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    // Dynamic Script Loader Promise
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

    // Profile Card HTML Generator
    function createProfileCardHTML(profile) {
        const booksHTML = profile.books && profile.books.length > 0
            ? profile.books.map(b => `<li class="book-tag">${b}</li>`).join('')
            : '<li class="book-tag">စာအုပ်မရှိသေးပါ</li>';

        return `
            <div class="profile-card">
                <div class="card-header">
                    <img src="${profile.photo || 'https://via.placeholder.com/45'}" alt="${profile.displayName}" class="card-avatar">
                    <div class="card-user-info">
                        <h3>${profile.displayName}</h3>
                        <span class="card-username">@${profile.username}</span>
                        <div><span class="card-community">${profile.community || 'General'}</span></div>
                    </div>
                </div>
                <p class="card-bio">${profile.bio || ''}</p>
                <div class="card-details">
                    <div class="detail-item"><strong>လင့်ခ်:</strong> <a href="${profile.link}" target="_blank" rel="noopener">${profile.link}</a></div>
                    <div class="detail-item"><strong>ဆက်သွယ်ရန်:</strong> ${profile.contact || 'မရှိပါ။'}</div>
                </div>
                <div class="card-books">
                    <h4>စာရင်းသွင်းဖူးသော စာအုပ်များ:</h4>
                    <ul class="books-list">${booksHTML}</ul>
                </div>
            </div>
        `;
    }

    // ⭐ Lazy On-Demand Search & Dynamic Loading Engine
    async function handleSearch(query) {
        if (query.length === 0) {
            clearBtn.style.display = 'none';
            autocompleteDropdown.style.display = 'none';
            return;
        }

        clearBtn.style.display = 'flex';
        toggleLoading(true);

        try {
            // ၁။ Root Index (`main-index.js`) ရှိမရှိ စစ်မယ်၊ မရှိရင် load မယ်
            if (typeof getRootIndex !== 'function') {
                await loadScript('main-index.js');
            }

            const rootIndices = getRootIndex();
            let matchedProfiles = [];

            // ရိုက်လိုက်တဲ့ query ရဲ့ ပထမစာလုံး (ဥပမာ 'bohtoo' ဆိုရင် 'b') ကို ယူမယ်
            const firstChar = query.charAt(0);
            const targetRoot = rootIndices.find(r => r.key === firstChar);

            if (targetRoot) {
                // သက်ဆိုင်ရာ Index ဖိုင်ကို dynamic load မယ် (ဥပမာ indices/index-b.js)
                await loadScript(targetRoot.file);
                const indexFunctionName = `getIndex_${targetRoot.key}`;

                if (typeof window[indexFunctionName] === 'function') {
                    const subIndexEntries = window[indexFunctionName]();
                    
                    // query နဲ့ ကိုက်ညီသော prefix ရှိသည့် entry များကို ဇကာတိုက်မယ်
                    const relevantEntries = subIndexEntries.filter(entry => 
                        entry.prefix.toLowerCase().startsWith(query) || query.startsWith(entry.prefix)
                    );

                    // သက်ဆိုင်ရာ Chunk ဖိုင်များကို cache စစ်ပြီး on-demand load မယ်
                    for (const entry of relevantEntries) {
                        if (!loadedChunksCache[entry.chunk]) {
                            await loadScript(entry.chunk);
                            loadedChunksCache[entry.chunk] = true;
                        }

                        // Chunk function name ကို တည်ဆောက်မည် (ဥပမာ chunks/chunk-bo.js -> getChunk_bo)
                        const chunkFileName = entry.chunk.split('/').pop().replace('.js', '');
                        const chunkKey = chunkFileName.replace('chunk-', '');
                        const chunkFunctionName = `getChunk_${chunkKey}`;

                        if (typeof window[chunkFunctionName] === 'function') {
                            const chunkData = window[chunkFunctionName]();
                            const filtered = chunkData.filter(p => 
                                p.username.toLowerCase().includes(query) || p.displayName.toLowerCase().includes(query)
                            );
                            matchedProfiles = matchedProfiles.concat(filtered);
                        }
                    }
                }
            }

            displayAutocompleteResults(matchedProfiles);

        } catch (error) {
            console.error("Search Loading Error:", error);
            autocompleteDropdown.innerHTML = `<div class="no-result">ရှာဖွေရာတွင် အမှားအယွင်းရှိပါသည်</div>`;
            autocompleteDropdown.style.display = 'block';
        } finally {
            toggleLoading(false);
        }
    }

    function displayAutocompleteResults(matches) {
        // Duplicate များကို ဖယ်ရှားခြင်း
        const uniqueMatches = Array.from(new Set(matches.map(m => m.username)))
            .map(username => matches.find(m => m.username === username))
            .slice(0, 10);

        if (uniqueMatches.length > 0) {
            autocompleteDropdown.innerHTML = uniqueMatches.map(m => `
                <div class="dropdown-item" data-username="${m.username}" data-chunk="${m.username.charAt(0)}">
                    <img src="${m.photo}" class="dropdown-avatar" alt="">
                    <div>
                        <strong>${m.displayName}</strong>
                        <div style="font-size:0.75rem; color:var(--subtext-color);">@${m.username}</div>
                    </div>
                </div>
            `).join('');
            autocompleteDropdown.style.display = 'block';
        } else {
            autocompleteDropdown.innerHTML = `<div class="no-result">မတွေ့ရှိရပါ</div>`;
            autocompleteDropdown.style.display = 'block';
        }
    }

    // Input Event with Debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        clearTimeout(searchTimeout);

        if (query.length === 0) {
            clearBtn.style.display = 'none';
            autocompleteDropdown.style.display = 'none';
            selectedProfileContainer.style.display = 'none';
            return;
        }

        searchTimeout = setTimeout(() => {
            handleSearch(query);
        }, 250);
    });

    // Dropdown Item Click Event (Select Profile)
    autocompleteDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (item) {
            const username = item.getAttribute('data-username');
            
            // Loaded ဖြစ်ပြီးသား Cache တွေထဲက ရှာထုတ်မယ်
            let selectedProfile = null;
            for (const chunkPath in loadedChunksCache) {
                const chunkFileName = chunkPath.split('/').pop().replace('.js', '');
                const chunkKey = chunkFileName.replace('chunk-', '');
                const chunkFunctionName = `getChunk_${chunkKey}`;
                if (typeof window[chunkFunctionName] === 'function') {
                    const found = window[chunkFunctionName]().find(p => p.username === username);
                    if (found) {
                        selectedProfile = found;
                        break;
                    }
                }
            }

            if (selectedProfile) {
                selectedProfileContainer.innerHTML = createProfileCardHTML(selectedProfile);
                selectedProfileContainer.style.display = 'block';
                selectedProfileContainer.scrollIntoView({ behavior: 'smooth' });
            }

            autocompleteDropdown.style.display = 'none';
            searchInput.value = '';
            clearBtn.style.display = 'none';
        }
    });

    // Clear Button Action
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        autocompleteDropdown.style.display = 'none';
        selectedProfileContainer.style.display = 'none';
        searchInput.focus();
    });

    // Blur UX handling
    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            autocompleteDropdown.style.display = 'none';
        }, 200);
    });
});
