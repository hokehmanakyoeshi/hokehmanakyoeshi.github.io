/**
 * Dynamic New Feed System (Enterprise Grade & Unified Architecture)
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

        // --- Safe Global Function Checker (Polling for Async Script Execution) ---
        async function waitForGlobalFunction(funcName, timeout = 1000) {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                if (typeof window[funcName] === 'function') {
                    return window[funcName];
                }
                await new Promise(resolve => setTimeout(resolve, 20));
            }
            return null;
        }

        // --- Core Feed Generation Workflow (Unified Engine) ---
        async function initAutoNewFeed(maxAttempts = 4) {
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

            // Self-Healing Loop for 99.99% Reliability
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await loadScriptWithRetry(core, 'main-book-index.js');
                    
                    const getRootFunc = await waitForGlobalFunction('getRootBookIndex');
                    if (!getRootFunc) throw new Error("getRootBookIndex missing");

                    const rootIndices = getRootFunc();
                    if (!rootIndices || rootIndices.length === 0) throw new Error("Root indices empty");

                    // Random Root Selection
                    const randomRoot = rootIndices[Math.floor(Math.random() * rootIndices.length)];
                    await loadScriptWithRetry(core, randomRoot.file);

                    const rootSuffix = extractSuffix(randomRoot.file, 'book-index-');
                    const rootFuncName = `getBookIndex_${rootSuffix}`;
                    
                    const getSubFunc = await waitForGlobalFunction(rootFuncName);
                    if (!getSubFunc) continue; 

                    const subEntries = getSubFunc();
                    const validChunks = subEntries.filter(e => e.chunk);
                    if (validChunks.length === 0) continue; 

                    // Random Chunk Selection
                    const randomEntry = validChunks[Math.floor(Math.random() * validChunks.length)];
                    await loadScriptWithRetry(core, randomEntry.chunk);

                    const chunkKey = extractSuffix(randomEntry.chunk, 'chunk-book-');
                    const chunkFuncName = `getChunkBook_${chunkKey}`;
                    
                    const getChunkFunc = await waitForGlobalFunction(chunkFuncName);
                    if (!getChunkFunc) continue;

                    const chunkBooks = getChunkFunc();
                    if (!chunkBooks || chunkBooks.length === 0) continue;

                    // Processing Books Data
                    const shuffled = [...chunkBooks].sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, 20);

                    container.innerHTML = selected.map(book => core.createBookCardHTML(book, false)).join('');
                    container.style.display = 'block';
                    loading.style.display = 'none';
                    
                    isGenerating = false;
                    return;

                } catch (err) {
                    console.warn(`Attempt ${attempt} failed, retrying...`, err);
                    if (attempt === maxAttempts) {
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
            refreshBtn.addEventListener('click', () => initAutoNewFeed(4));
        }

        // --- Initial Single Execution (Clean & Smooth Visual Flow) ---
        setTimeout(() => {
            initAutoNewFeed(4);
        }, 100);
    });
})();
