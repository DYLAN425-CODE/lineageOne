document.addEventListener('DOMContentLoaded', () => {
    const activeCharString = localStorage.getItem('activeCharacter');
    if (!activeCharString) {
        // If no active character is set, redirect back to the dashboard.
        window.location.href = 'dashboard.html';
        return;
    }
    const activeChar = JSON.parse(activeCharString);
    document.getElementById('game-welcome').textContent = `Welcome, ${activeChar.name}!`;
});