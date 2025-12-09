// Screen order configuration
const screens = [
    'index.html',
    '1.2.html',
    '1.3.html',
    '1.4.html',
    '1.5.html',
    '2.1.html',
    '2.2.html',
    '2.3.html',
    '2.4.html',
    '2.5.html',
    '3.1.html',
    '3.2.html',
    '3.3.html',
    '3.4.html',
    '3.5.html'
];

// Get current screen index
function getCurrentScreenIndex() {
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    return screens.indexOf(currentFile);
}

// Navigate to next screen
function goForward() {
    const currentIndex = getCurrentScreenIndex();
    if (currentIndex < screens.length - 1) {
        window.location.href = screens[currentIndex + 1];
    }
}

// Navigate to previous screen
function goBack() {
    const currentIndex = getCurrentScreenIndex();
    if (currentIndex > 0) {
        window.location.href = screens[currentIndex - 1];
    }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        goBack();
    } else if (e.key === 'ArrowRight') {
        goForward();
    } else if (e.key === 'Escape') {
        closeNotes();
    }
});

// Notes popup
function openNotes() {
    document.getElementById('notesOverlay').classList.add('active');
}

function closeNotes() {
    document.getElementById('notesOverlay').classList.remove('active');
}

