document.addEventListener('DOMContentLoaded', () => {
    const refreshFeedBtn = document.getElementById('refreshFeedBtn');

    function loadScriptOnce(filePath) {
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

    async function generateMinarNewFeed() {
        const newFeedContainer = document.getElementById('newFeedContainer');
        const newFeedLoading = document.getElementById('newFeedLoading');

        if (!newFeedContainer || !newFeedLoading) return;

        // Loading ကို အစပြုပြသမည်
        newFeedLoading.style.display = 'flex';
        newFeedContainer.style.display = 'none';
        newFeedContainer.innerHTML = '';

        try {
            if (typeof getRootBookIndex !== 'function') {
                await loadScriptOnce('main-book-index.js');
            }

            const rootIndices = getRootBookIndex();
            if (!rootIndices || rootIndices.length === 0) {
                newFeedLoading.innerHTML = `<span style="color:var(--subtext-color);">စာအုပ် အညွှန်းများ မတွေ့ရှိရပါ။</span>`;
                return;
            }

            let allChunkPaths = [];

            // Root အားလုံးမှ Chunk လမ်းကြောင်းများကို အပြည့်အစုံ စုဆောင်းမည်
            for (const root of rootIndices) {
                await loadScriptOnce(root.file);
                const suffix = root.file.split('/').pop().replace('.js', '').replace('book-index-', '');
                const indexFuncName = `getBookIndex_${suffix}`;

                if (typeof window[indexFuncName] === 'function') {
                    const subEntries = window[indexFuncName]();
                    subEntries.forEach(entry => {
                        if (entry.chunk && !allChunkPaths.includes(entry.chunk)) {
                            allChunkPaths.push(entry.chunk);
                        }
                    });
                }
            }

            if (allChunkPaths.length === 0) {
                newFeedLoading.innerHTML = `<span style="color:var(--subtext-color);">Chunk စာရင်းများ မရှိသေးပါ။</span>`;
                return;
            }

            // စုထားသော Chunk ဖိုင်များထဲမှ တစ်ခုကို Random ရွေးမည်
            const randomChunkPath = allChunkPaths[Math.floor(Math.random() * allChunkPaths.length)];
            await loadScriptOnce(randomChunkPath);

            const chunkFileName = randomChunkPath.split('/').pop().replace('.js', '');
            const chunkKey = chunkFileName.replace('chunk-book-', '');
            const chunkFunctionName = `getChunkBook_${chunkKey}`;

            if (typeof window[chunkFunctionName] === 'function') {
                const chunkBooks = window[chunkFunctionName]();

                if (chunkBooks && chunkBooks.length > 0) {
                    // ရလာသော Chunk ထဲက စာအုပ်များကို Random ရောပြီး ၅ အုပ် ယူမည်
                    const shuffledBooks = [...chunkBooks].sort(() => 0.5 - Math.random());
                    const selectedFeedBooks = shuffledBooks.slice(0, 5);

                    let feedHTML = '';
                    selectedFeedBooks.forEach(book => {
                        if (typeof createBookCardHTML === 'function') {
                            feedHTML += createBookCardHTML(book, false);
                        }
                    });

                    newFeedContainer.innerHTML = feedHTML;
                    newFeedContainer.style.display = 'block';
                } else {
                    newFeedLoading.innerHTML = `<span style="color:var(--subtext-color);">ဤကဏ္ဍတွင် စာအုပ် မရှိသေးပါ။</span>`;
                }
            }

        } catch (error) {
            console.error("New Feed Loading Error:", error);
            newFeedLoading.innerHTML = `<span style="color:var(--subtext-color);">New Feed တင်ရာတွင် အမှားအယွင်းရှိပါသည်</span>`;
        } finally {
            // Loading ကို ဖျောက်မည်
            if (newFeedLoading) {
                newFeedLoading.style.display = 'none';
            }
        }
    }

    // "လဲလှယ်ရန်" ခလုတ်ကို နှိပ်လျှင် အလုပ်လုပ်ရန်
    if (refreshFeedBtn) {
        refreshFeedBtn.addEventListener('click', () => {
            generateMinarNewFeed();
        });
    }

    // ဝင်ဝင်ချင်း အလိုအလျောက် အလုပ်လုပ်စေရန် DOMContentLoaded ထဲမှာ တိုက်ရိုက်ခေါ်ပေးခြင်း
    // (Element တွေ အသင့်ဖြစ်ချိန်ကို စောင့်ရန် setTimeout ခဏခံသုံးထားပါသည်)
    setTimeout(() => {
        generateMinarNewFeed();
    }, 100);
});
