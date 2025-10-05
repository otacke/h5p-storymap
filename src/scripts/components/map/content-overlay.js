import './content-overlay.scss';

export default class ContentOverlay {
  /**
   * @class
   */
  constructor() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-story-map-content-overlay');

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

    this.dom.innerHTML = '';
    this.dom.append(content);
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
}
