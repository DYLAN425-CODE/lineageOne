// ========================================================================
//  MODAL CLASS (REUSABLE)
// ========================================================================

/**
 * A reusable class to manage different types of confirmation and info modals.
 */

/**
 * Finds the main content element on the page to apply blur effect.
 * @returns {HTMLElement|null}
 */
const getContentElementsToBlur = () => {
    const elements = [
        document.getElementById('main-content'),
        document.getElementById('dashboard-content'),
        document.getElementById('page-content'),
        document.getElementById('bg-video-container') // Also blur the video background
    ];
    return elements.filter(el => el !== null); // Return only the elements that exist
};
class Modal {
    /**
     * @param {string} modalId The ID of the modal element in the DOM.
     */
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        if (!this.modal) {
            throw new Error(`Modal with ID "${modalId}" not found.`);
        }

        // Find the main content panel using a more generic selector
        this.modalContent = this.modal.querySelector('.character-slot, .ui-panel, .market-panel') || this.modal.firstElementChild;
        this.titleEl = this.modal.querySelector('[id$="-title"]');
        this.messageEl = this.modal.querySelector('[id$="-message"]');
        this.confirmBtn = this.modal.querySelector('[id$="-confirm-btn"]');
        this.cancelBtn = this.modal.querySelector('[id$="-cancel-btn"]');
        this.confirmInputContainer = this.modal.querySelector('[id$="-input-container"]');
        this.confirmInput = this.modal.querySelector('[id$="-input"]');
        this.confirmInputText = this.modal.querySelector('[id$="-input-text"]');

        // Bind methods to ensure 'this' is correct
        this.close = this.close.bind(this);
        this._handleConfirm = this._handleConfirm.bind(this);
        this._handleCancel = this._handleCancel.bind(this);
        this._handleKeydown = this._handleKeydown.bind(this);
        this._handleBackgroundClick = this._handleBackgroundClick.bind(this);
    }

    /**
     * Shows the modal with the specified options.
     * @param {object} options
     * @param {string} options.title - The title of the modal.
     * @param {string} options.message - The message content (can be HTML).
     * @param {string} [options.confirmText='Confirm'] - Text for the confirm button.
     * @param {string} [options.cancelText='Cancel'] - Text for the cancel button.
     * @param {string} [options.confirmClass='bg-red-800/80'] - CSS class for the confirm button.
     * @param {Function} [options.onConfirm] - Callback function when confirmed.
     * @param {Function} [options.onCancel] - Callback function when canceled.
     * @param {string} [options.typeToConfirm] - A string the user must type to enable the confirm button.
     */
    show({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmClass = 'bg-red-800/80', onConfirm, onCancel, typeToConfirm }) {
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;

        if (this.titleEl) this.titleEl.textContent = title;
        if (this.messageEl) this.messageEl.innerHTML = message;
        if (this.confirmBtn) this.confirmBtn.textContent = confirmText;
        if (this.cancelBtn) this.cancelBtn.textContent = cancelText;

        if (this.confirmBtn) {
            this.confirmBtn.className = `px-8 py-2 rounded-md transition-all duration-300 ${confirmClass}`;
        }

        if (typeToConfirm && this.confirmInputContainer) {
            this.confirmInputContainer.classList.remove('hidden');
            if (this.confirmInputText) this.confirmInputText.textContent = typeToConfirm;
            if (this.confirmInput) this.confirmInput.value = '';
            if (this.confirmBtn) this.confirmBtn.disabled = true;

            this.typeToConfirmHandler = () => {
                if (this.confirmBtn) this.confirmBtn.disabled = this.confirmInput.value !== typeToConfirm;
            };
            this.confirmInput.addEventListener('input', this.typeToConfirmHandler);
        } else if (this.confirmInputContainer) {
            this.confirmInputContainer.classList.add('hidden');
            if (this.confirmBtn) this.confirmBtn.disabled = false;
        }

        getContentElementsToBlur().forEach(el => el.classList.add('content-blur'));
        this.modal.classList.remove('hidden');
        setTimeout(() => {
            this.modal.classList.add('opacity-100');
            if (this.modalContent) this.modalContent.classList.add('scale-100');
        }, 10);

        this.confirmBtn?.addEventListener('click', this._handleConfirm);
        this.cancelBtn?.addEventListener('click', this._handleCancel);
        this.modal.addEventListener('click', this._handleBackgroundClick);
        document.addEventListener('keydown', this._handleKeydown);
    }

    close() {
        getContentElementsToBlur().forEach(el => el.classList.remove('content-blur'));
        this.modal.classList.remove('opacity-100');
        if (this.modalContent) this.modalContent.classList.remove('scale-100');

        this.confirmBtn?.removeEventListener('click', this._handleConfirm);
        this.cancelBtn?.removeEventListener('click', this._handleCancel);
        this.modal.removeEventListener('click', this._handleBackgroundClick);
        document.removeEventListener('keydown', this._handleKeydown);
        if (this.typeToConfirmHandler) {
            this.confirmInput?.removeEventListener('input', this.typeToConfirmHandler);
        }

        setTimeout(() => this.modal.classList.add('hidden'), 300);
    }

    _handleConfirm() { this.onConfirm?.(); this.close(); }
    _handleCancel() { this.onCancel?.(); this.close(); }
    _handleBackgroundClick(e) { if (e.target === this.modal) this._handleCancel(); }
    _handleKeydown(e) { if (e.key === 'Escape') this._handleCancel(); }
}

/**
 * Shows a generic informational modal with a single "OK" button.
 * @param {string} title The title of the modal.
 * @param {string} message The message to display.
 * @param {object} [options] - Optional parameters.
 * @param {'success' | 'error' | 'info'} [options.type='info'] The type of notification for styling.
 * @param {Function} [options.onOk] Optional callback to run when OK is clicked.
 * @param {number|null} [options.autoClose=null] Milliseconds to wait before auto-closing.
 */
function showInfoModal(title, message, { type = 'info', onOk, autoClose = null } = {}) {
    const infoModal = document.getElementById('info-modal');
    const modalTitle = document.getElementById('info-modal-title');
    const modalMessage = document.getElementById('info-modal-message');
    const modalContent = document.getElementById('info-modal-content');
    const okBtn = document.getElementById('info-modal-ok-btn');

    if (!infoModal || !modalTitle || !modalMessage || !okBtn) {
        alert(`${title}\n\n${message.replace(/<br\s*\/?>/gi, '\n')}`); // Fallback
        onOk?.();
        return;
    }

    // Icons for different types
    const icons = {
        success: '<span class="text-green-400">✔</span>',
        error: '<span class="text-red-400">✖</span>',
        info: '' // Remove the info icon
    };

    modalTitle.innerHTML = `${icons[type] || icons['info']} ${title}`;
    modalMessage.innerHTML = message;

    // Reset colors before applying new ones
    modalTitle.classList.remove('text-green-400', 'text-red-400', 'text-yellow-400');
    modalTitle.classList.add(`text-${type === 'success' ? 'green' : type === 'error' ? 'red' : 'yellow'}-400`);

    const elementsToBlur = getContentElementsToBlur();
    const closeModal = () => {
        // Clear any auto-close timer
        if (closeModal.timer) clearTimeout(closeModal.timer);
        modalContent?.classList.remove('shake'); // Clean up shake class on close
        infoModal.classList.remove('opacity-100');
        infoModal.querySelector('#info-modal-content')?.classList.remove('scale-100');
        setTimeout(() => infoModal.classList.add('hidden'), 300);
        elementsToBlur.forEach(el => el.classList.remove('content-blur'));
        onOk?.();
    };

    // Auto-close functionality
    if (autoClose) {
        closeModal.timer = setTimeout(closeModal, autoClose);
    }

    okBtn.addEventListener('click', closeModal, { once: true });
    infoModal.addEventListener('click', (e) => { if (e.target === infoModal) closeModal(); }, { once: true });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); }, { once: true });
    
    elementsToBlur.forEach(el => el.classList.add('content-blur'));
    infoModal.classList.remove('hidden');
    setTimeout(() => {
        infoModal.classList.add('opacity-100');
        modalContent?.classList.add('scale-100');
        // If it's an error, add the shake animation
        if (type === 'error' && modalContent) {
            modalContent.classList.add('shake');
            // Remove the class after the animation so it can be re-triggered
            setTimeout(() => modalContent.classList.remove('shake'), 600);
        }
    }, 10);
}