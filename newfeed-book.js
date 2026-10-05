document.addEventListener('DOMContentLoaded', () => {
    const newFeedContainer = document.getElementById('newFeedContainer');
    const newFeedLoading = document.getElementById('newFeedLoading');
    const refreshFeedBtn = document.getElementById('refreshFeedBtn');

    // Script များကို တစ်ကြိမ်တည်း သေချာဆွဲရန် Cache Map
    const loadedScripts = {};
    // ခလုတ်ကို ဆက်တိုက်နှိပ်ခြင်းမှ ကာကွယ်ရန် Lock Flag
    let isGenerating = false;

    function loadScriptSafely(filePath) {
        if (loadedScripts[filePath]) {
            return loadedScripts[filePath];
        }

        loadedScripts[filePath] = new Promise((resolve) => {
            if (document.querySelector(`script[src="${filePath}"]`)) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = filePath;
            script.onload = () => resolve(true);
            script.onerror = () => {
                delete loadedScripts[filePath]; // Error တက်ရင် ပြန်ဖျက်မည်
                resolve(false);
            };
            document.head.appendChild(script);
        });

        return loadedScripts[filePath];
    }

    async function initAutoNewFeed() {
        // အကယ်၍ အလုပ်လုပ်နေဆဲဆိုလျှင် နောက်ထပ်ထပ်မလုပ်ရန် တားဆီးမည် (Race Condition ကာကွယ်ရန်)
        if (isGenerating) return;
        if (!newFeedContainer || !newFeedLoading) return;

        isGenerating = true;
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
                isGenerating = false;
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
                            // Chunk ထဲက စာအုပ်များကို Random ရောပြီး အများဆုံး စာအုပ် ၂၀ အုပ်သာ ယူမည်
                            const shuffled = [...chunkBooks].sort(() => 0.5 - Math.random());
                            const selected = shuffled.slice(0, 20);

                            let html = '';
                            selected.forEach(book => {
                                if (typeof createBookCardHTML === 'function') {
                                    html += createBookCardHTML(book, false);
                                }
                            });

                            newFeedContainer.innerHTML = html;
                            newFeedContainer.style.display = 'block';
                            newFeedLoading.style.display = 'none';
                            isGenerating = false;
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
        } finally {
            isGenerating = false; // လုပ်ငန်းစဉ်ပြီးဆုံးသည်နှင့် Lock ပြန်ဖြုတ်မည်
        }
    }

    // လဲလှယ်ရန် ခလုတ်အတွက် Event Listener
    if (refreshFeedBtn) {
        refreshFeedBtn.addEventListener('click', () => {
            initAutoNewFeed();
        });
    }

    // စာမျက်နှာ ဝင်လာသည်နှင့် ချက်ချင်း အလိုအလျောက် ခေါ်ယူပေးမည့်စနစ် (Direct Call with Timeout)
    setTimeout(() => {
        initAutoNewFeed();
    }, 150);
});
