import { extend } from '@services/util.js';
import './progress-indicator.scss';

export default class ProgressIndicator {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {number} [params.min] Minimum value.
   * @param {number} [params.max] Maximum value.
   * @param {number} [params.now] Current value.
   * @param {object} params.dictionary Dictionary service.
   */
  constructor(params = {}) {
    this.params = extend({
      min: 1,
      max: 1,
      now: 1,
    }, params);

    this.min = this.params.min;
    this.max = this.params.max;
    this.now = this.params.now;

    this.dom = document.createElement('div');
    this.dom.className = 'progress-indicator';
    this.dom.setAttribute('role', 'meter');
    this.dom.setAttribute('aria-valuemin', this.params.min);
    this.dom.setAttribute('aria-valuemax', this.params.max);
    this.dom.setAttribute('aria-valuenow', this.params.now);
    this.dom.setAttribute('aria-label', this.params.dictionary.get('a11y.progressIndicator'));

    this.progressNow = document.createElement('div');
    this.progressNow.className = 'progress-now';
    this.progressNow.setAttribute('aria-hidden', 'true');
    this.progressNow.innerText = this.params.now;
    this.dom.appendChild(this.progressNow);

    this.progressSeparator = document.createElement('div');
    this.progressSeparator.className = 'progress-separator';
    this.dom.appendChild(this.progressSeparator);

    this.progressMax = document.createElement('div');
    this.progressMax.className = 'progress-max';
    this.progressMax.setAttribute('aria-hidden', 'true');
    this.progressMax.innerText = this.params.max;
    this.dom.appendChild(this.progressMax);

    this.progressText = document.createElement('div');
    this.progressText.className = 'progress-text';
    this.progressText.setAttribute('aria-hidden', 'true');
    this.progressText.innerText = '';
    this.dom.appendChild(this.progressText);
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update progress indicator.
   * @param {object} param Parameters.
   * @param {number} [param.min] Minimum value.
   * @param {number} [param.max] Maximum value.
   * @param {number} [param.now] Current value.
   * @param {string} [param.text] Text to show instead of numbers.
   */
  update({ min, max, now, text }) {
    if (typeof min === 'number' && min > this.min) {
      this.min = min;
      this.dom.setAttribute('aria-valuemin', min);
    }

    if (typeof max === 'number' && max > this.min) {
      this.max = max;
      this.dom.setAttribute('aria-valuemax', max);
      this.progressMax.innerText = max;
    }

    if (typeof now === 'number' && now >= this.min && now <= this.max) {
      this.now = now;
      this.dom.setAttribute('aria-valuenow', now);
      this.progressNow.innerText = now;
    }

    if (typeof text === 'string') {
      this.progressText.innerText = text;
    }
  }

  /**
   * Toggle text mode instead of numbers.
   * @param {boolean} on True to turn on text mode, false for numbers.
   */
  toggleTextMode(on) {
    if (typeof on !== 'boolean') {
      return;
    }

    this.progressNow.classList.toggle('display-none', on);
    this.progressSeparator.classList.toggle('display-none', on);
    this.progressMax.classList.toggle('display-none', on);
    this.progressText.classList.toggle('display-none', !on);

    if (on) {
      this.dom.setAttribute('aria-valuetext', this.progressText.innerText);
    }
    else {
      this.dom.removeAttribute('aria-valuetext');
    }
  }
}
