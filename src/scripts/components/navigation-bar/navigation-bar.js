import Button from './button.js';
import ProgressIndicator from './progress-indicator.js';
import { extend } from '@services/util.js';
import './navigation-bar.scss';

export default class NavigationBar {

  /**
   * @class
   * @param {object} [params] Parameters for the navigation bar.
   * @param {object} [params.dictionary] Dictionary for localization.
   * @param {object} [callbacks] Callbacks for events.
   * @param {function} [callbacks.onClickButtonLeft] Callback for click on left button.
   * @param {function} [callbacks.onClickButtonRight] Callback for click on right button.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({}, params);

    this.callbacks = extend({
      onClickButtonLeft: () => {},
      onClickButtonRight: () => {},
      onClickButtonReset: () => {},
      onClickButtonMiniMap: () => {},
      onClickButtonFullscreen: () => {},
    }, callbacks);

    this.buttons = {};

    const { dom, buttons } = this.buildDOM();
    this.dom = dom;
    this.buttons.left = buttons.left;
    this.buttons.right = buttons.right;
    this.buttons.reset = buttons.reset;
    if (buttons.minimap) {
      this.buttons.minimap = buttons.minimap;
    }
    if (buttons.fullscreen) {
      this.buttons.fullscreen = buttons.fullscreen;
    }

    // Make first button active one
    Object.values(this.buttons).forEach((button, index) => {
      button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
    this.currentButtonIndex = 0;
  }

  /**
   * Get the DOM element of the navigation bar.
   * @returns {HTMLElement} The DOM element of the navigation bar.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Build the DOM for the navigation bar.
   * @returns {object} Object containing the DOM and buttons.
   */
  buildDOM() {
    const dom = this.buildMainContainer();

    const { container: buttonsContainerNavigation, buttons: navigationButtons } = this.buildNavigationButtons();
    dom.append(buttonsContainerNavigation);

    const progressIndicator = this.buildProgressIndicator();
    dom.append(progressIndicator);

    const { container: buttonsContainerActions, buttons: actionButtons } = this.buildActionButtons();
    dom.append(buttonsContainerActions);

    const buttons = {
      ...navigationButtons,
      ...actionButtons,
    };

    return { dom, buttons };
  }

  /**
   * Build main container.
   * @returns {HTMLElement} Main navigation bar container.
   */
  buildMainContainer() {
    const dom = document.createElement('nav');
    dom.classList.add('h5p-story-map-navigation-bar');
    dom.setAttribute('role', 'toolbar');
    dom.setAttribute('aria-label', this.params.dictionary.get('a11y.navigationBar'));

    dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    return dom;
  }

  /**
   * Build navigation buttons container.
   * @returns {object} Object containing the container and buttons.
   */
  buildNavigationButtons() {
    const buttons = {};
    const buttonsContainerNavigation = document.createElement('div');
    buttonsContainerNavigation.classList.add('h5p-story-map-navigation-bar-buttons-container-navigation');

    buttons.left = new Button(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.buttonPreviousContent'),
          disabled: this.params.dictionary.get('a11y.buttonPreviousContentDisabled'),
        },
        classes: [
          'h5p-story-map-button',
          'h5p-story-map-button-left',
        ],
        disabled: true,
        type: 'pulse',
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonLeft();
        },
      },
    );
    buttonsContainerNavigation.append(buttons.left.getDOM());

    buttons.right = new Button(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.buttonNextContent'),
          disabled: this.params.dictionary.get('a11y.buttonNextContentDisabled'),
        },
        classes: [
          'h5p-story-map-button',
          'h5p-story-map-button-right',
        ],
        disabled: true,
        type: 'pulse',
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonRight();
        },
      },
    );
    buttonsContainerNavigation.append(buttons.right.getDOM());

    return { container: buttonsContainerNavigation, buttons };
  }

  /**
   * Build progress indicator.
   * @returns {HTMLElement} Progress indicator DOM.
   */
  buildProgressIndicator() {
    this.progressIndicator = new ProgressIndicator({
      dictionary: this.params.dictionary,
    });
    this.progressIndicator.toggleTextMode(true);

    return this.progressIndicator.getDOM();
  }

  /**
   * Build action buttons container.
   * @returns {object} Object containing the container and buttons.
   */
  buildActionButtons() {
    const buttons = {};
    const buttonsContainerActions = document.createElement('div');
    buttonsContainerActions.classList.add('h5p-story-map-navigation-bar-buttons-container-actions');

    buttons.reset = new Button(
      {
        id: 'reset',
        type: 'pulse',
        a11y: {
          active: this.params.dictionary.get('a11y.buttonResetActive'),
        },
        classes: [
          'h5p-story-map-button',
          'h5p-story-map-button-reset',
        ],
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonReset();
        },
      },
    );
    buttonsContainerActions.append(buttons.reset.getDOM());

    if (this.params.userCanUseMiniMap) {
      buttons.minimap = new Button(
        {
          id: 'mini-map',
          type: 'toggle',
          a11y: {
            active: this.params.dictionary.get('a11y.buttonMiniMapActive'),
            inactive: this.params.dictionary.get('a11y.buttonMiniMapInactive'),
          },
          classes: [
            'h5p-story-map-button',
            'h5p-story-map-button-mini-map',
          ],
        },
        {
          onClick: () => {
            this.callbacks.onClickButtonMiniMap();
          },
        },
      );

      buttonsContainerActions.append(buttons.minimap.getDOM());
    }

    if (this.params.globals.get('isFullscreenSupported')) {
      buttons.fullscreen = new Button(
        {
          id: 'fullscreen',
          type: 'toggle',
          a11y: {
            active: this.params.dictionary.get('a11y.exitFullscreen'),
            inactive: this.params.dictionary.get('a11y.enterFullscreen'),
          },
          classes: [
            'h5p-story-map-button',
            'h5p-story-map-button-fullscreen',
            'enter-fullscreen',
          ],
        },
        {
          onClick: () => {
            this.callbacks.onClickButtonFullscreen();
          },
        },
      );

      buttonsContainerActions.append(buttons.fullscreen.getDOM());
    }

    return { container: buttonsContainerActions, buttons };
  }

  /**
   * Set fullscreen state.
   * @param {boolean} [state] True to enter fullscreen, false to exit fullscreen.
   */
  setFullscreen(state) {
    if (!this.buttons.fullscreen) {
      return; // Fullscreen button not available
    }

    this.buttons.fullscreen.toggleClass('enter-fullscreen', state !== true);
    this.buttons.fullscreen.toggleClass('exit-fullscreen', state === true);
    this.buttons.fullscreen.toggleClass('active', state === true);
  }

  /**
   * Get the width of the navigation bar.
   * @returns {number} Width of the navigation bar.
   */
  getHeight() {
    return this.dom.offsetHeight;
  }

  /**
   * Get the minimum height of the navigation bar based on its children.
   * @returns {number} Minimum height of the navigation bar.
   */
  getMinHeight() {
    const childrenMaxHeight = Array.from(this.dom.children).reduce((max, child) => {
      return Math.max(max, child.offsetHeight);
    }, 0);

    const padding = parseFloat(getComputedStyle(this.dom).paddingTop) +
    parseFloat(getComputedStyle(this.dom).paddingBottom);

    return childrenMaxHeight + padding;
  }

  /**
   * Get full height.
   * @returns {number} Full height in px.
   */
  getFullHeight() {
    const styles = window.getComputedStyle(this.dom);
    const margin = parseFloat(styles.getPropertyValue('margin-top')) +
      parseFloat(styles.getPropertyValue('margin-bottom'));

    return Math.ceil(this.dom.offsetHeight + margin);
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      this.moveButtonFocus(-1);
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      this.moveButtonFocus(1);
    }
    else if (event.code === 'Home') {
      this.moveButtonFocus(0 - this.currentButtonIndex);
    }
    else if (event.code === 'End') {
      this.moveButtonFocus(
        Object.keys(this.buttons).length - 1 - this.currentButtonIndex,
      );
    }
    else {
      return;
    }

    event.preventDefault();
  }

  /**
   * Move button focus.
   * @param {number} offset Offset to move position by.
   */
  moveButtonFocus(offset) {
    if (typeof offset !== 'number') {
      return;
    }

    if (
      this.currentButtonIndex + offset < 0 ||
      this.currentButtonIndex + offset > Object.keys(this.buttons).length - 1
    ) {
      return; // Don't cycle
    }

    Object.values(this.buttons)[this.currentButtonIndex].setAttribute('tabindex', '-1');
    this.currentButtonIndex = this.currentButtonIndex + offset;
    const focusButton = Object.values(this.buttons)[this.currentButtonIndex];
    focusButton.setAttribute('tabindex', '0');
    focusButton.focus();
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   */
  enableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].enable();
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].disable();
  }

  /**
   * Show button.
   * @param {string} id Button id.
   */
  showButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].show();
  }

  /**
   * Hide button.
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].hide();
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focus(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].focus();
  }

  /**
   * Focus the first available button.
   */
  focusFirstButton() {
    this.moveButtonFocus(0 - this.currentButtonIndex);
  }

  /**
   * Update the navigation bar.
   * @param {object} [params] Parameters to update the navigation bar.
   * @param {boolean} [params.left] If true, enable the left button, else disable it.
   * @param {boolean} [params.right] If true, enable the right button, else disable it.
   */
  update(params = {}) {
    if (typeof params.left === 'boolean') {
      if (params.left) {
        this.enableButton('left');
      }
      else {
        this.disableButton('left');
      }
    }

    if (typeof params.right === 'boolean') {
      if (params.right) {
        this.enableButton('right');
      }
      else {
        this.disableButton('right');
      }
    }

    this.progressIndicator.update({
      now: params.now, min: params.min, max: params.max, text: params.text,
    });
  }

  /**
   * Toggle progress text mode.
   * @param {boolean} on True to turn on text mode, false to turn it off.
   */
  toggleProgressTextMode(on) {
    this.progressIndicator.toggleTextMode(on);
  }

  /**
   * Reset navigation bar.
   */
  reset() {
    this.update({ text: '' });
    this.toggleProgressTextMode(true);
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      minimapActive: this.buttons.minimap?.isActive() ?? false,
    };
  }

  /**
   * Set current state.
   * @param {object} state State to set, must match return value from getCurrentState.
   */
  setCurrentState(state = {}) {
    if (this.buttons.minimap && state.minimapActive === true) {
      this.buttons.minimap.forceState(true);
    }
  }
}
