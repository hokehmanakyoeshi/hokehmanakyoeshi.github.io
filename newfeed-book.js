document.addEventListener('DOMContentLoaded', () => {
    const newFeedContainer = document.getElementById('newFeedContainer');
    const newFeedLoading = document.getElementById('newFeedLoading');
    const refreshFeedBtn = document.getElementById('refreshFeedBtn');

    function loadScriptSafely(filePath) {
        return new Promise((resolve) => {
            if (document.querySelector(`script[src="${filePath}"]`)) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = filePath;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    }

    async function initAutoNewFeed() {
        if (!newFeedContainer || !newFeedLoading) return;

        newFeedLoading.style.display = 'flex';
        newFeedContainer.style.display = 'none';
        newFeedContainer.innerHTML = '';

        try {
            await loadScriptSafely('main-book-index.js');

            if (typeof getRootBookIndex !== 'function') {
                throw new Error("Root book index not found");
            }

            const rootIndices = getRootBookIndex();
            if (!rootIndices || rootIndices.length === 0) {
                newFeedLoading.innerHTML = `<span style="color:var(--subtext-color);">စာအုပ် အညွှန်းများ မရှိပါ။</span>`;
                newFeedLoading.style.display = 'flex';
                return;
            }

            const randomRoot = rootIndices[Math.floor(Math.random() * rootIndices.length)];
            await loadScriptSafely(randomRoot.file);

            const suffix = randomRoot.file.split('/').pop().replace('.js', '').replace('book-index-', '');
            const indexFuncName = `getBookIndex_${suffix}`;

            if (typeof window[indexFuncName] === 'function') {
                const subEntries = window[indexFuncName]();
                const validChunks = subEntries.filter(e => e.chunk);

                if (validChunks.length > 0) {
                    const randomEntry = validChunks[Math.floor(Math.random() * validChunks.length)];
                    await loadScriptSafely(randomEntry.chunk);

                    const chunkFileName = randomEntry.chunk.split('/').pop().replace('.js', '');
                    const chunkKey = chunkFileName.replace('chunk-book-', '');
                    const chunkFunctionName = `getChunkBook_${chunkKey}`;

                    if (typeof window[chunkFunctionName] === 'function') {
                        const chunkBooks = window[chunkFunctionName]();

                        if (chunkBooks && chunkBooks.length > 0) {
                            const shuffled = [...chunkBooks].sort(() => 0.5 - Math.random());
                            const selected = shuffled.slice(0, 5);

                            let html = '';
                            selected.forEach(book => {
                                // main-book-app.js ထဲမှာ ရှိမည့် createBookCardHTML ကို လှမ်းသုံးသည်
                                if (typeof createBookCardHTML === 'function') {
                                    html += createBookCardHTML(book, false);
                                }
                            });

                            newFeedContainer.innerHTML = html;
                            newFeedContainer.style.display = 'block';
                            newFeedLoading.style.display = 'none';
                            return;
                        }
                    }
                }
            }
            
            newFeedLoading.style.display = 'none';
            newFeedContainer.style.display = 'block';

        } catch (err) {
            console.error("Auto New Feed Error:", err);
            newFeedLoading.style.display = 'none';
        }
    }

    // လဲလှယ်ရန် ခလုတ်အတွက် Event Listener
    if (refreshFeedBtn) {
        refreshFeedBtn.addEventListener('click', () => {
            initAutoNewFeed();
        });
    }

    // စာမျက်နှာ ဝင်လာသည်နှင့် ၃၀၀ မီလီစက္ကန့်စောင့်ပြီး ခလုတ်ကို အလိုအလျောက် နှိပ်ခိုင်းခြင်း (Auto-Trigger)
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (refreshFeedBtn) {
                refreshFeedBtn.click();
            } else {
                initAutoNewFeed();
            }
        }, 300);
    });
});
