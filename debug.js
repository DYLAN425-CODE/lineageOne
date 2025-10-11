// ========================================================================
//  MODAL DEBUGGING SCRIPT
// ========================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Debug] DOM fully loaded. Initializing modal debugger.');

    const modalIds = [
      'loginForm', 'registerForm', 'passwordResetFlow', 'marketplace', 'characterCreationForm', 'dashboard', 'droplist', 'itemViewer',
      'lightbox', 'success-modal', 'info-modal', 'quantity-modal', 'confirm-modal', 'notification-modal', 'item-viewer-modal'
    ];

    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          const isHidden = target.classList.contains('hidden');
          if (isHidden) {
            console.log(`[Debug] Modal/Panel hidden: #${target.id}`);
          } else {
            console.log(`[Debug] Modal/Panel shown: #${target.id}`);
          }
        }
      }
    });

    modalIds.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        observer.observe(modal, { attributes: true });
        console.log(`[Debug] Watching for changes on #${id}`);
      } else {
        console.warn(`[Debug] Modal/Panel with id #${id} not found.`);
      }
    });
});