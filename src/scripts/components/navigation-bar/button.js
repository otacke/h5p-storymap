import './button.scss';
import { extend } from '@services/util.js';

export default class Button {
  /**
   * @class
   * @param {object} params Parameter from editor.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params, callbacks) {
    // Set missing params
    this.params = extend({
      a11y: {
        active: '',
        disabled: '',
        inactive: '',
      },
      active: false,
      classes: [],
      disabled: false,
      type: 'pulse',
    }, params || {});

    if (!Array.isArray(this.params.classes)) {
      this.params.classes = [this.params.classes];
    }

    if (this.params.type === 'pulse') {
      if (!this.params.a11y.inactive) {
        this.params.a11y.inactive = this.params.a11y.active || '';
      }
      if (!this.params.a11y.active) {
        this.params.a11y.active = this.params.a11y.inactive || '';
      }
    }

    this.active = this.params.active;
    this.disabled = this.params.disabled;

    // Sanitize callbacks
    this.callbacks = callbacks || {};
    this.callbacks.onClick = this.callbacks.onClick || (() => {});

    // Button
    this.dom = document.createElement('button');

    if (this.params.classes) {
      this.params.classes.forEach((className) => {
        this.dom.classList.add(className);
      });
    }
    this.dom.setAttribute('aria-pressed', this.params.active);

    if (this.params.active === true) {
      this.activate();
    }
    else {
      this.deactivate();
    }

    if (this.params.disabled === true) {
      this.disable();
    }
    else {
      this.enable();
    }

    this.dom.addEventListener('click', (event) => {
      if (this.disabled) {
        return;
      }

      if (this.params.type === 'toggle') {
        this.toggle();
      }
      this.callbacks.onClick(event);
    });

    H5P.Tooltip?.(this.dom, { position: 'bottom' });
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show button.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide button.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Focus button.
   */
  focus() {
    this.dom.focus();
  }

  /**
   * Set tabbable or not.
   * @param {boolean} tabbable If true, set tabbable. If false, untabbable.
   */
  setTabbable(tabbable) {
    if (tabbable === true) {
      this.dom.setAttribute('tabindex', '0');
    }
    else if (tabbable === false) {
      this.dom.setAttribute('tabindex', '-1');
    }
  }

  /**
   * Enable button.
   */
  enable() {
    this.disabled = false;

    this.dom.classList.remove('disabled');

    if (this.active) {
      this.activate();
    }
    else {
      this.deactivate();
    }
  }

  /**
   * Disable button.
   */
  disable() {
    this.dom.classList.add('disabled');
    this.dom.setAttribute('aria-label', this.params.a11y.disabled);

    this.disabled = true;
  }

  /**
   * Activate button.
   */
  activate() {
    if (this.disabled) {
      return;
    }

    if (this.params.type === 'toggle') {
      this.dom.classList.add('active');
      this.dom.setAttribute('aria-pressed', true);
    }

    this.dom.setAttribute('aria-label', this.params.a11y.active);

    this.active = true;
  }

  /**
   * Deactivate button.
   */
  deactivate() {
    if (this.disabled) {
      return;
    }

    this.active = false;

    if (this.params.type === 'toggle') {
      this.dom.classList.remove('active');
      this.dom.setAttribute('aria-pressed', false);
    }

    this.dom.setAttribute('aria-label', this.params.a11y.inactive);
  }

  /**
   * Toggle active state.
   * @param {boolean} [shouldBeActive] True to activate, false to deactivate button. If not set, toggle current state.
   * @param {object} [options] Options.
   * @param {boolean} [options.ignoreDisabled] True to ignore disabled state, false to respect it. Default false.
   */
  toggle(shouldBeActive, options = {}) {
    if (!options.ignoreDisabled && this.disabled) {
      return;
    }

    if (typeof shouldBeActive !== 'boolean') {
      shouldBeActive = !this.active;
    }

    if (shouldBeActive) {
      this.activate();
    }
    else {
      this.deactivate();
    }
  }

  /**
   * Set attribute.
   * @param {string} attribute Attribute key.
   * @param {string} value Attribute value.
   */
  setAttribute(attribute, value) {
    this.dom.setAttribute(attribute, value);
  }

  /**
   * Toggle class on button.
   * @param {string} className Class name to toggle.
   * @param {boolean} state True to add class, false to remove.
   */
  toggleClass(className, state) {
    this.dom.classList.toggle(className, state);
  }

  /**
   * Determine whether button is active.
   * @returns {boolean} True, if button is active, else false.
   */
  isActive() {
    return this.active;
  }

  /**
   * Determine whether button is disabled.
   * @returns {boolean} True, if button is disabled, else false.
   */
  isDisabled() {
    return this.disabled;
  }

  /**
   * Force button state and optionally skip callback. Ignores disabled state.
   * @param {boolean} active True to activate, false to deactivate button.
   * @param {boolean} [skipCallback] True to skip callback, false to trigger it. Default false.
   */
  forceState(active, skipCallback = false) {
    if (this.params.type === 'toggle') {
      this.toggle(active, { ignoreDisabled: true });
    }

    if (!skipCallback) {
      this.callbacks.onClick();
    }
  }
}
