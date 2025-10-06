import Screenreader from '@services/screenreader.js';
import Map from '@components/map/map.js';
import NavigationBar from '@components/navigation-bar/navigation-bar.js';
import { extend } from '@services/util.js';
import './main.scss';

/**
 * Main DOM component incl. main controller.
 */
export default class Main {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({}, params);
    this.callbacks = extend({
      onRequestFullScreen: () => {},
    }, callbacks);

    this.openWaypointContentIndex = -1;
    this.lastMarkerIndex = this.params.map.waypoints.length - 1;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-story-map-main');

    this.navigationBar = new NavigationBar(
      {
        globals: this.params.globals,
        dictionary: this.params.dictionary,
        userCanUseMiniMap: this.params.behaviour.userCanUseMiniMap,
      },
      {
        onClickButtonLeft: () => {
          this.goBackward();
        },
        onClickButtonRight: () => {
          this.goForward();
        },
        onClickButtonReset: () => {
          this.reset();
        },
        onClickButtonMiniMap: () => {
          this.toggleMiniMap();
        },
        onClickButtonFullscreen: () => {
          this.callbacks.onRequestFullScreen();
        },
      },
    );
    this.dom.append(this.navigationBar.getDOM());

    this.map = new Map(
      {
        globals: this.params.globals,
        dictionary: this.params.dictionary,
        waypoints: this.params.map.waypoints,
        zoomLevelDefault: this.params.map.zoomLevelDefault,
        mapStyle: this.params.visual.mapStyle,
        userCanUseMiniMap: this.params.behaviour.userCanUseMiniMap,
        showPaths: this.params.behaviour.showPaths,
        previousState: this.params.previousState?.map || {},
      },
      {
        onWaypointContentOpened: (index) => {
          this.handleWaypointContentOpened(index);
        },
        onMarkerFocus: (waypoint) => {
          this.map.centerOnWaypoint(waypoint, this.getCurrentOpenWaypointContentIndex !== -1);
        },
      },
    );
    this.dom.append(this.map.getDOM());

    // Screenreader for polite screen reading
    document.body.append(Screenreader.getDOM());

    this.addKeyboardShortcuts();
    this.updateButtonDisabledStates();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set fullscreen mode.
   * @param {boolean} shouldBeFullScreen Whether we should be in fullscreen mode.
   */
  setFullscreen(shouldBeFullScreen) {
    if (typeof shouldBeFullScreen !== 'boolean') {
      return;
    }

    const style = window.getComputedStyle(this.dom);

    const marginHorizontal = parseFloat(style.getPropertyValue('margin-left')) +
      parseFloat(style.getPropertyValue('margin-right'));

    const marginVertical = parseFloat(style.getPropertyValue('margin-top')) +
      parseFloat(style.getPropertyValue('margin-bottom'));

    this.map.setFullscreen(shouldBeFullScreen, {
      width: window.innerWidth - marginHorizontal,
      height: window.innerHeight - marginVertical - this.navigationBar.getFullHeight(),
    });

    this.navigationBar.setFullscreen(shouldBeFullScreen);
  }

  handleWaypointContentOpened(index) {
    this.openWaypointContentIndex = index;
    this.updateButtonDisabledStates();

    const textToRead = this.params.dictionary.get('a11y.openedContent')
      .replace('@title', this.map.getWaypointByIndex(index)?.getTitle() || '');
    Screenreader.read(textToRead);
  }

  /**
   * Go to previous waypoint.
   */
  goBackward() {
    this.map.openWaypointContentByIndex(this.openWaypointContentIndex - 1);
  }

  /**
   * Go to next waypoint.
   */
  goForward() {
    this.map.openWaypointContentByIndex(this.openWaypointContentIndex + 1);
  }

  /**
   * Add keyboard shortcuts.
   */
  addKeyboardShortcuts() {
    this.dom.addEventListener('keydown', (event) => {
      if (event.altKey && event.key.toLowerCase() === 't') {
        this.handleNavigationBarShortcut(event);
      }
    });
  }

  /**
   * Handle keyboard shortcut to focus navigation bar.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleNavigationBarShortcut(event) {
    if (this.navigationBar.getDOM().contains(document.activeElement)) {
      return; // Focus is already in the toolbar, don't steal global shortcut
    }

    event.stopPropagation();
    event.preventDefault();
    this.navigationBar.focusFirstButton();
  }

  /**
   * Update disabled states of navigation buttons.
   */
  updateButtonDisabledStates() {
    const waypoint = this.map.getWaypointByIndex(this.openWaypointContentIndex);
    const title = waypoint ? waypoint.getTitle() : null;

    this.navigationBar.update({
      left: this.openWaypointContentIndex > 0,
      right: this.openWaypointContentIndex < this.lastMarkerIndex,
      text: title,
    });
  }

  /**
   * Toggle mini map.
   */
  toggleMiniMap() {
    this.map.toggleMiniMap();
  }

  /**
   * Resize map.
   */
  resize() {
    this.map.resize();
  }

  /**
   * Reset.
   */
  reset() {
    this.openWaypointContentIndex = -1;
    this.updateButtonDisabledStates();
    this.map.reset();
    this.navigationBar.reset();
  }

  /**
   * Get index of currently open waypoint content.
   * @returns {number} Index of currently open waypoint content. -1 if none is open.
   */
  getCurrentOpenWaypointContentIndex() {
    return this.openWaypointContentIndex;
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      openWaypointContentIndex: this.getCurrentOpenWaypointContentIndex(),
      navigationBar: this.navigationBar.getCurrentState(),
      map: this.map.getCurrentState(),
    };
  }

  /**
   * Set current state.
   * @param {object} state State to set, must match return value from getCurrentState.
   */
  setCurrentState(state = {}) {
    this.openWaypointContentIndex = state?.openWaypointContentIndex ?? -1;
    this.updateButtonDisabledStates();
    this.navigationBar.setCurrentState(state?.navigationBar);

    this.map.setCurrentState(state?.map);
    this.map.openWaypointContentByIndex(state?.openWaypointContentIndex, {
      panTo: false, // Avoid panning away from previously set coordinates
      contentOpen: this.openWaypointContentIndex !== -1,
    });
  }
}
