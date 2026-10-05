/**
 * Dynamic New Feed System
 */
(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('newFeedContainer');
        const loading = document.getElementById('newFeedLoading');
        const refreshBtn = document.getElementById('refreshFeedBtn');

        let isGenerating = false;

        async function initAutoNewFeed() {
            if (isGenerating || !container || !loading) return;

            isGenerating = true;
            loading.style.display = 'flex';
            container.style.display = 'none';
            container.innerHTML = '';

            try {
                const core = window.BookAppCore;
                if (!core) throw new Error("BookAppCore not loaded");

                await core.loadScript('main-book-index.js');

                if (typeof getRootBookIndex !== 'function') {
                    throw new Error("Root book index not found");
                }

                const rootIndices = getRootBookIndex();
                if (!rootIndices || rootIndices.length === 0) {
                    loading.innerHTML = `<span style="color:var(--subtext-color);">စာအုပ် အညွှန်းများ မရှိပါ။</span>`;
                    loading.style.display = 'flex';
                    isGenerating = false;
                    return;
                }

                const randomRoot = rootIndices[Math.floor(Math.random() * rootIndices.length)];
                await core.loadScript(randomRoot.file);

                const suffix = randomRoot.file.split('/').pop().replace('.js', '').replace('book-index-', '');
                const indexFuncName = `getBookIndex_${suffix}`;

                if (typeof window[indexFuncName] === 'function') {
                    const subEntries = window[indexFuncName]();
                    const validChunks = subEntries.filter(e => e.chunk);

                    if (validChunks.length > 0) {
                        const randomEntry = validChunks[Math.floor(Math.random() * validChunks.length)];
                        await core.loadScript(randomEntry.chunk);

                        const chunkKey = randomEntry.chunk.split('/').pop().replace('.js', '').replace('chunk-book-', '');
                        const chunkFunctionName = `getChunkBook_${chunkKey}`;

                        if (typeof window[chunkFunctionName] === 'function') {
                            const chunkBooks = window[chunkFunctionName]();

                            if (chunkBooks && chunkBooks.length > 0) {
                                const shuffled = [...chunkBooks].sort(() => 0.5 - Math.random());
                                const selected = shuffled.slice(0, 20);

                                let html = '';
                                selected.forEach(book => {
                                    html += core.createBookCardHTML(book, false);
                                });

                                container.innerHTML = html;
                                container.style.display = 'block';
                                loading.style.display = 'none';
                                isGenerating = false;
                                return;
                            }
                        }
                    }
                }
                
                loading.style.display = 'none';
                container.style.display = 'block';

            } catch (err) {
                console.error("Auto New Feed Error:", err);
                loading.style.display = 'none';
            } finally {
                isGenerating = false;
            }
        }

                // ခလုတ်ကို ပုံမှန် တစ်ချက်နှိပ်ရင် တစ်ကြိမ်ပဲ ဖလှယ်မည်
        if (refreshBtn) {
            refreshBtn.addEventListener('click', initAutoNewFeed);
        }

        // ဝင်ဝင်ချင်းမှာ နှစ်ချက်ဆက်တိုက် (Double Execution) အလိုအလျောက် ဖြစ်စေရန်
        setTimeout(async () => {
            await initAutoNewFeed(); // ပထမအကြိမ် ဆွဲမည်
            setTimeout(async () => {
                await initAutoNewFeed(); // ခေတ္တရပ်ပြီး ဒုတိယအကြိမ် ထပ်ဆွဲမည်
            }, 100); 
        }, 150);

    });
})();
