// ========================================================================
//  MODAL CLASS (REUSABLE)
// ========================================================================

/**
 * A reusable class to manage different types of confirmation and info modals.
 */

/**
 * Finds the main content element(s) on the page to hide when a modal is open.
 * @returns {HTMLElement[]} An array of content elements to hide.
 */
const getContentElementsToHide = () => {
    const elements = [
        document.getElementById('main-content'),
        document.getElementById('dashboard-content'),
        document.getElementById('page-content')
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
        // Find buttons ending in -confirm-btn OR -ok-btn
        this.confirmBtn = this.modal.querySelector('[id$="-confirm-btn"], [id$="-ok-btn"]');
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
     * @param {boolean} [options.allowTitleHTML=false] - If true, allows HTML in the title.
     */
    show({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', confirmClass = 'bg-red-800/80', onConfirm, onCancel, typeToConfirm, allowTitleHTML = false }) {
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;

        if (this.titleEl) {
            // Use innerHTML only if explicitly allowed, otherwise use textContent for security
            allowTitleHTML ? (this.titleEl.innerHTML = title) : (this.titleEl.textContent = title);
        }

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

        // Hide main page content
        getContentElementsToHide().forEach(el => el.classList.add('hidden'));

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
        // Show main page content again
        getContentElementsToHide().forEach(el => el.classList.remove('hidden'));

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

// --- Global Modal Functions ---
// We define them in the global scope so they can be called from other scripts,
// but we will initialize the actual modal instance only after the DOM is ready.
let infoModal;

document.addEventListener('DOMContentLoaded', () => {
    // Instantiate the info modal ONLY when the DOM is fully loaded.
    try {
        // This assumes an element with id="info-modal" exists in the HTML.
        infoModal = new Modal('info-modal');
    } catch (e) {
        console.error("Could not initialize the main info-modal. It might be missing from the HTML.", e);
    }
});

/**
 * Shows a generic informational modal with a single "OK" button.
 * @param {string} title The title of the modal.
 * @param {string} message The message to display.
 * @param {object} [options={}] - Optional parameters.
 * @param {'success' | 'error' | 'info'} [options.type='info'] The type of notification for styling.
 * @param {Function} [options.onOk] Optional callback to run when OK is clicked.
 * @param {number|null} [options.autoClose=null] Milliseconds to wait before auto-closing.
 */
function showInfoModal(title, message, { type = 'info', onOk, autoClose = null } = {}) {
    // Fallback for cases where the modal might not be in the DOM or not yet initialized
    if (!infoModal?.modal) {
        alert(`${title}\n\n${message.replace(/<br\s*\/?>/gi, '\n')}`); // Fallback
        onOk?.();
        return;
    }

    const icons = {
        success: '<span class="text-green-400">✔</span>',
        error: '<span class="text-red-400">✖</span>',
        info: '', // Removed the 'i' icon for a cleaner look
        warning: '<span class="text-orange-400">⚠</span>'
    };

    // Hide the cancel button as this is an info-only modal
    if (infoModal.cancelBtn) {
        infoModal.cancelBtn.classList.add('hidden');
    }

    let autoCloseTimer = null;
    const handleOk = () => {
        if (autoCloseTimer) clearTimeout(autoCloseTimer);
        onOk?.();
    };

    const modalTitleWithIcon = `${icons[type] || icons.info} ${title}`;

    infoModal.show({
        title: modalTitleWithIcon,
        message: message,
        confirmText: 'OK',
        onConfirm: handleOk,
        onCancel: handleOk, // Also call onOk if closed via Esc or background click
        allowTitleHTML: true // Explicitly allow HTML for the icon
    });

    // If it's an error, add the shake animation
    if (type === 'error' && infoModal.modalContent) {
        infoModal.modalContent.classList.add('shake');
        setTimeout(() => infoModal.modalContent.classList.remove('shake'), 600);
    }

    if (autoClose) {
        autoCloseTimer = setTimeout(() => infoModal.close(), autoClose);
    }
}

/**
 * A convenience wrapper for showing a success modal.
 * @param {string} title The title of the modal.
 * @param {string} message The message to display.
 * @param {object} [options] - Optional parameters.
 * @param {Function} [options.onOk] Optional callback to run when OK is clicked.
 * @param {number|null} [options.autoClose=null] Milliseconds to wait before auto-closing.
 */
function showSuccessModal(title, message, options = {}) {
    showInfoModal(title, message, { ...options, type: 'success' });
}

/**
 * A convenience wrapper for showing a warning modal.
 * @param {string} title The title of the modal.
 * @param {string} message The message to display.
 * @param {object} [options={}] - Optional parameters.
 */
function showWarningModal(title, message, options = {}) {
    showInfoModal(title, message, { ...options, type: 'warning' });
}