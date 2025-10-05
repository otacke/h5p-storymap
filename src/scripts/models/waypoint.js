import ContentBundle from '@components/content-bundle/content-bundle.js';
import { extend } from '@services/util.js';

export default class Waypoint {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} [params.waypointParams] Waypoint parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    params.waypointParams = extend({
      index: -1,
      id: H5P.createUUID(),
      latitude: 0,
      longitude: 0,
    }, params.waypointParams);

    this.callbacks = extend({
      onFocusBlur: () => {},
    }, callbacks);

    this.params = extend({}, params);

    this.params.waypointParams.title =
      this.params.waypointParams.title || this.params.dictionary.get('l10n.unnamedWaypoint');

    this.contentBundle = new ContentBundle({
      globals: this.params.globals,
      contents: this.params.waypointParams.contents || [],
    });

    this.tooltip = params.tooltip;
  }

  /**
   * Get the ID of the waypoint.
   * @returns {string} The ID of the waypoint.
   */
  getId() {
    return this.params.waypointParams.id;
  }

  /**
   * Get the index of the waypoint.
   * @returns {number} The index of the waypoint.
   */
  getIndex() {
    return this.params.waypointParams.index;
  }

  /**
   * Get the title of the waypoint.
   * @returns {string} The title of the waypoint.
   */
  getTitle() {
    return this.params.waypointParams.title;
  }

  /**
   * Get the leaflet marker.
   * @returns {object} The leaflet marker.
   */
  getMarker() {
    return this.params.marker;
  }

  /**
   * Set the marker open state.
   * @param {boolean} [open] Whether the marker should be open.
   */
  setOpen(open = false) {
    const markerElement = this.params.marker.getElement();
    markerElement.classList.toggle('open', open);
    this.markerIsOpen = open;
  }

  /**
   * Check if the marker is open.
   * @returns {boolean} True if the marker is open, false otherwise.
   */
  isOpen() {
    return this.markerIsOpen;
  }

  /**
   * Hide tooltip.
   */
  hideTooltip() {
    this.tooltip?.hide();
  }

  /**
   * Show content DOM.
   */
  showContentDOM() {
    this.contentBundle.show();
  }

  /**
   * Hide content DOM.
   */
  hideContentDOM() {
    this.contentBundle.hide();
  }

  /**
   * Get content DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getContentDOM() {
    return this.contentBundle.getDOM();
  }
}
