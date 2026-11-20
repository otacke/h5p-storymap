import { extend } from '@services/util.js';
import './content-overlay.scss';

export default class ContentOverlay {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClose] Called when user closes the overlay.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({}, params);

    this.callbacks = extend({
      onClose: () => {},
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-story-map-content-overlay');

    const closeButtonLabel = this.params.dictionary.get('a11y.closeContent');
    this.closeButton = document.createElement('button');
    this.closeButton.classList.add('h5p-story-map-content-overlay-close-button');
    this.closeButton.setAttribute('aria-label', closeButtonLabel);
    this.closeButton.addEventListener('click', () => {
      this.callbacks.onClose();
    });
    H5P.Tooltip?.(this.closeButton, { position: 'left' });
    this.dom.append(this.closeButton);

    this.contentContainer = document.createElement('div');
    this.contentContainer.classList.add('h5p-story-map-content-overlay-content');
    this.dom.append(this.contentContainer);

    this.hide();
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set bundle content for overlay.
   * @param {HTMLElement} content Content to set.
   */
  setContent(content) {
    if (!(content instanceof HTMLElement)) {
      return;
    }

    this.contentContainer.innerHTML = '';
    this.contentContainer.append(content);
  }

  /**
   * Show overlay.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide overlay.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Determine whether overlay is visible.
   * @returns {boolean} True, if overlay is visible.
   */
  isVisible() {
    return !this.dom.classList.contains('display-none');
  }

  /**
   * Determine whether overlay covers the full width of its container.
   * @returns {boolean} True, if overlay covers full width.
   */
  isFullWidth() {
    const container = this.dom.parentElement;
    if (!container || !this.isVisible()) {
      return false;
    }

    const containerStyle = window.getComputedStyle(container);
    const containerContentWidth = container.clientWidth -
      parseFloat(containerStyle.paddingLeft) - parseFloat(containerStyle.paddingRight);

    // Allow sub-pixel rounding
    return this.dom.getBoundingClientRect().width >= containerContentWidth - 1;
  }
}
