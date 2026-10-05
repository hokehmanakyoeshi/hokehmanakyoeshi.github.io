/**
 * Dynamic New Feed System (Optimized & Clean Architecture)
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

        // --- Core Feed Generation Workflow ---
        async function initAutoNewFeed() {
            if (isGenerating || !container || !loading) return;

            isGenerating = true;
            loading.style.display = 'flex';
            container.style.display = 'none';
            container.innerHTML = '';

            try {
                const core = window.BookAppCore;
                if (!core) throw new Error("BookAppCore is not loaded");

                // ၁။ Root Book Index ကို ဆွဲထုတ်ခြင်း
                await core.loadScript('main-book-index.js');
                if (typeof getRootBookIndex !== 'function') {
                    throw new Error("getRootBookIndex function not found");
                }

                const rootIndices = getRootBookIndex();
                if (!rootIndices || rootIndices.length === 0) {
                    showEmptyState("စာအုပ် အညွှန်းများ မရှိပါ။");
                    return;
                }

                // ၂။ Root ထဲမှ တစ်ခုကို Random ရွေးပြီး ဖိုင်ခေါ်ခြင်း
                const randomRoot = rootIndices[Math.floor(Math.random() * rootIndices.length)];
                await core.loadScript(randomRoot.file);

                const rootSuffix = extractSuffix(randomRoot.file, 'book-index-');
                const rootFuncName = `getBookIndex_${rootSuffix}`;

                if (typeof window[rootFuncName] !== 'function') {
                    throw new Error(`Function ${rootFuncName} not found`);
                }

                const subEntries = window[rootFuncName]();
                const validChunks = subEntries.filter(e => e.chunk);

                if (validChunks.length === 0) {
                    showEmptyState("စာအုပ် အစုအဝေးများ မရှိပါ။");
                    return;
                }

                // ၃။ Chunk ထဲမှ တစ်ခုကို Random ရွေးပြီး ဒေတာဆွဲခြင်း
                const randomEntry = validChunks[Math.floor(Math.random() * validChunks.length)];
                await core.loadScript(randomEntry.chunk);

                const chunkKey = extractSuffix(randomEntry.chunk, 'chunk-book-');
                const chunkFuncName = `getChunkBook_${chunkKey}`;

                if (typeof window[chunkFuncName] !== 'function') {
                    throw new Error(`Function ${chunkFuncName} not found`);
                }

                const chunkBooks = window[chunkFuncName]();
                if (!chunkBooks || chunkBooks.length === 0) {
                    showEmptyState("စာအုပ် အချက်အလက် မရှိပါ။");
                    return;
                }

                // ၄။ ရလာသော စာအုပ်များကို Random ရော၍ အများဆုံး ၂၀ အုပ် ယူခြင်း
                const shuffled = [...chunkBooks].sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, 20);

                const html = selected.map(book => core.createBookCardHTML(book, false)).join('');
                
                container.innerHTML = html;
                container.style.display = 'block';
                loading.style.display = 'none';

            } catch (err) {
                console.error("Auto New Feed Error:", err);
                showEmptyState("စာအုပ်များ ပေါ်လာရန် အမှားအယွင်းရှိနေပါသည်။");
            } finally {
                isGenerating = false; // လုပ်ငန်းစဉ်ပြီးဆုံးသည်နှင့် Lock ပြန်ဖြုတ်မည်
            }
        }

        // --- Empty/Error State UI Helper ---
        function showEmptyState(message) {
            loading.innerHTML = `<span style="color:var(--subtext-color);">${message}</span>`;
            loading.style.display = 'flex';
            container.style.display = 'none';
        }

        // --- Event Listeners ---
        if (refreshBtn) {
            refreshBtn.addEventListener('click', initAutoNewFeed);
        }

        // --- ဝင်ဝင်ချင်းမှာ နှစ်ချက်ဆက်တိုက် (Double Execution) အလိုအလျောက် ဖြစ်စေရန် ---
        setTimeout(async () => {
            await initAutoNewFeed();
            setTimeout(async () => {
                await initAutoNewFeed();
            }, 100); 
        }, 150);
    });
})();
