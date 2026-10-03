document.addEventListener('DOMContentLoaded', () => {
    const modeToggleBtn = document.getElementById('modeToggleBtn');
    if (!modeToggleBtn) return;
    let currentMode = localStorage.getItem('book_site_mode') || 'classic';
    
    const icons = {
        classic: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
        dark: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
        reading: `<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
    };
    
    function applyMode(mode) {
        document.body.classList.remove('dark-mode', 'reading-mode');
        if (mode === 'dark') {
            document.body.classList.add('dark-mode');
            modeToggleBtn.innerHTML = icons.dark;
        } else if (mode === 'reading') {
            document.body.classList.add('reading-mode');
            modeToggleBtn.innerHTML = icons.reading;
        } else {
            modeToggleBtn.innerHTML = icons.classic;
        }
        localStorage.setItem('book_site_mode', mode);
    }
    
    applyMode(currentMode);
    
    modeToggleBtn.addEventListener('click', () => {
        if (currentMode === 'classic') currentMode = 'dark';
        else if (currentMode === 'dark') currentMode = 'reading';
        else currentMode = 'classic';
        applyMode(currentMode);
    });
});
