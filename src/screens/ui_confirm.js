// Confirmation modal helpers
window.showConfirm = function (message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const msg = document.getElementById('confirm-message');
    const yes = document.getElementById('confirm-yes');
    const no = document.getElementById('confirm-no');
    if (!modal || !msg || !yes || !no) return;
    msg.textContent = message || 'Are you sure?';
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    const cleanup = () => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        yes.removeEventListener('click', onYes);
        no.removeEventListener('click', onNo);
        document.removeEventListener('keydown', onKey);
    };

    function onYes() {
        cleanup();
        if (typeof onConfirm === 'function') onConfirm();
    }
    function onNo() { cleanup(); }
    function onKey(e) { if (e.key === 'Escape') onNo(); }

    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
    document.addEventListener('keydown', onKey);
};
