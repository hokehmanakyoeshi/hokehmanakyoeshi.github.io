/**
 * Dynamic Recommended Profiles Feed System
 */
(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        const container = document.getElementById('newFeedContainer');
        const loading = document.getElementById('newFeedLoading');
        const refreshBtn = document.getElementById('refreshFeedBtn');

        let isGenerating = false;

        function extractSuffix(filePath, prefixToRemove) {
            return filePath.split('/').pop().replace('.js', '').replace(prefixToRemove, '');
        }

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

        async function initAutoProfileFeed(maxAttempts = 4) {
            if (isGenerating || !container || !loading) return;

            isGenerating = true;
            loading.style.display = 'flex';
            container.style.display = 'none';
            container.innerHTML = '';

            const core = window.ProfileAppCore;
            if (!core) {
                showEmptyState("စနစ် အခြေခံ မူလဖိုင် မတွေ့ပါ။");
                isGenerating = false;
                return;
            }

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await loadScriptWithRetry(core, 'profile-indices/profile-index-root.js');
                    
                    const getRootFunc = await waitForGlobalFunction('getRootProfileIndex');
                    if (!getRootFunc) throw new Error("getRootProfileIndex missing");

                    const rootIndices = getRootFunc();
                    if (!rootIndices || rootIndices.length === 0) throw new Error("Root indices empty");

                    const randomRoot = rootIndices[Math.floor(Math.random() * rootIndices.length)];
                    await loadScriptWithRetry(core, randomRoot.file);

                    const rootSuffix = extractSuffix(randomRoot.file, 'profile-index-');
                    const rootFuncName = `getProfileIndex_${rootSuffix}`;
                    
                    const getSubFunc = await waitForGlobalFunction(rootFuncName);
                    if (!getSubFunc) continue; 

                    const subEntries = getSubFunc();
                    if (subEntries.length === 0) continue; 

                    const randomEntry = subEntries[Math.floor(Math.random() * subEntries.length)];
                    await loadScriptWithRetry(core, randomEntry.chunk);

                    const chunkKey = extractSuffix(randomEntry.chunk, 'chunk-profile-');
                    const chunkFuncName = `getChunkProfile_${chunkKey}`;
                    
                    const getChunkFunc = await waitForGlobalFunction(chunkFuncName);
                    if (!getChunkFunc) continue;

                    const chunkProfiles = getChunkFunc();
                    if (!chunkProfiles || chunkProfiles.length === 0) continue;

                    const shuffled = [...chunkProfiles].sort(() => 0.5 - Math.random());
                    const selected = shuffled.slice(0, 15);

                    container.innerHTML = selected.map(profile => core.createProfileCardHTML(profile, false)).join('');
                    container.style.display = 'block';
                    loading.style.display = 'none';
                    
                    isGenerating = false;
                    return;

                } catch (err) {
                    console.warn(`Attempt ${attempt} failed, retrying...`, err);
                    if (attempt === maxAttempts) {
                        showEmptyState("ပရိုဖိုင်များ ပေါ်လာရန် အမှားအယွင်းရှိနေပါသည်။");
                    }
                }
            }

            isGenerating = false;
        }

        function showEmptyState(message) {
            loading.innerHTML = `<span style="color:var(--subtext-color);">${message}</span>`;
            loading.style.display = 'flex';
            container.style.display = 'none';
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => initAutoProfileFeed(4));
        }

        setTimeout(() => {
            initAutoProfileFeed(4);
        }, 100);
    });
})();
