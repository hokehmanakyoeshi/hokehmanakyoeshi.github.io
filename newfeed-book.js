/**
 * Dynamic New Feed System (Enterprise Grade & Self-Healing Architecture)
 */
(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('newFeedContainer');
        const loading = document.getElementById('newFeedLoading');
        const refreshBtn = document.getElementById('refreshFeedBtn');

        let isGenerating = false;

        // --- Helper Function: ဖိုင်နာမည်မှ Suffix ဖြတ်ထုတ်ရန် ---
        function extractSuffix(filePath, prefixToRemove) {
            return filePath.split('/').pop().replace('.js', '').replace(prefixToRemove, '');
        }

        // --- Robust Script Loader with Retry ---
        async function loadScriptWithRetry(core, scriptPath, retries = 2) {
            for (let i = 0; i <= retries; i++) {
                try {
                    await core.loadScript(scriptPath);
                    return true;
                } catch (err) {
                    if (i === retries) throw err;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        }

        // --- Core Feed Generation Workflow (with Self-Healing Retry) ---
        async function initAutoNewFeed(maxAttempts = 3) {
            if (isGenerating || !container || !loading) return;

            isGenerating = true;
            loading.style.display = 'flex';
            container.style.display = 'none';
            container.innerHTML = '';

            const core = window.BookAppCore;
            if (!core) {
                console.error("BookAppCore is not loaded");
                showEmptyState("စနစ် အခြေခံ မူလဖိုင် မတွေ့ပါ။");
                isGenerating = false;
                return;
            }

            // Self-Healing Loop: တစ်ခုခုမှားယွင်းရင် အခြားလမ်းကြောင်းဖြင့် အလိုအလျောက် ထပ်ကြိုးစားမည်
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await loadScriptWithRetry(core, 'main-book-index.js');
                    if (typeof getRootBookIndex !== 'function') throw new Error("getRootBookIndex missing");

                    const rootIndices = getRootBookIndex();
                    if (!rootIndices || rootIndices.length === 0) throw new Error("Root indices empty");

                    // Random Root Selection
                    const randomRoot = rootIndices[Math.floor(Math.random() * rootIndices.length)];
                    await loadScriptWithRetry(core, randomRoot.file);

                    const rootSuffix = extractSuffix(randomRoot.file, 'book-index-');
                    const rootFuncName = `getBookIndex_${rootSuffix}`;
                    if (typeof window[rootFuncName] !== 'function') throw new Error(`${rootFuncName} missing`);

                    const subEntries = window[rootFuncName]();
                    const validChunks = subEntries.filter(e => e.chunk);
                    if (validChunks.length === 0) continue; // ဒီ Root မှာ chunk မရှိရင် နောက်တစ်ခုထပ်စမ်းမည်

                    // Random Chunk Selection
                    const randomEntry = validChunks[Math.floor(Math.random() * validChunks.length)];
                    await loadScriptWithRetry(core, randomEntry.chunk);

                    const chunkKey = extractSuffix(randomEntry.chunk, 'chunk-book-');
                    const chunkFuncName = `getChunkBook_${chunkKey}`;
                    if (typeof window[chunkFuncName] !== 'function') continue;

                    const chunkBooks = window[chunkFuncName]();
                    if (!chunkBooks || chunkBooks.length === 0) continue;

                    // Processing Books Data
                    const shuffled = [...chunkBooks].sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, 20);

                    container.innerHTML = selected.map(book => core.createBookCardHTML(book, false)).join('');
                    container.style.display = 'block';
                    loading.style.display = 'none';
                    
                    // အောင်မြင်စွာ ပြီးဆုံးပါက loop မှ ထွက်မည်
                    isGenerating = false;
                    return;

                } catch (err) {
                    console.warn(`Attempt ${attempt} failed, retrying...`, err);
                    if (attempt === maxAttempts) {
                        // အကြိမ်ရေပြည့်သွားမှသာ Error UI ကို ပြမည်
                        showEmptyState("စာအုပ်များ ပေါ်လာရန် အမှားအယွင်းရှိနေပါသည်။");
                    }
                }
            }

            isGenerating = false;
        }

        // --- UI Helper ---
        function showEmptyState(message) {
            loading.innerHTML = `<span style="color:var(--subtext-color);">${message}</span>`;
            loading.style.display = 'flex';
            container.style.display = 'none';
        }

        // --- Event Listeners ---
        if (refreshBtn) {
            // ခလုတ်နှိပ်လျှင်လည်း ဝင်ဝင်ချင်းလိုမျိုး 3 ကြိမ်အထိ Self-Healing ဖြင့် သေချာဆွဲပေးမည်
            refreshBtn.addEventListener('click', () => initAutoNewFeed(3));
        }

        // --- Initial Double Execution (Optimized Sequence) ---
        setTimeout(async () => {
            await initAutoNewFeed();
            setTimeout(async () => {
                await initAutoNewFeed();
            }, 150); 
        }, 150);
    });
})();
