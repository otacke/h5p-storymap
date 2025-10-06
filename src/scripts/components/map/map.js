import ContentOverlay from './content-overlay.js';
import GeoMap from './geo-map.js';
import { extend, parseAspectRatio } from '@services/util.js';
import './map.scss';

/** @constant {string} ASPECT_RATIO_DEFAULT Default aspect ratio if not set in CSS */
const ASPECT_RATIO_DEFAULT = '16 / 9';

/** @constant {number} MAP_CENTER_X_PERCENTAGE Map center X percentage. */
const MAP_CENTER_X_PERCENTAGE = 0.5;

/** @constant {number} MAP_CENTER_X_PERCENTAGE_CONTENT_OPEN Map center X percentage when content is open. */
const MAP_CENTER_X_PERCENTAGE_CONTENT_OPEN = 0.25;

export default class Map {
  constructor(params = {}, callbacks = {}) {
    this.params = extend({
      waypoints: [],
      mapStyle: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      showPaths: true,
      userCanUseMiniMap: true,
    }, params);

    this.callbacks = extend({
      onWaypointContentOpened: () => {},
      onMarkerFocus: () => {},
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-story-map-map');

    this.mapContainer = document.createElement('div');
    this.mapContainer.classList.add('h5p-story-map-map-container');
    this.dom.append(this.mapContainer);

    const coordinatesFirstWaypoint = {
      latitude: this.params.waypoints[0]?.latitude ?? null,
      longitude: this.params.waypoints[0]?.longitude ?? null,
    };

    // Geo map
    this.geoMap = new GeoMap(
      {
        globals: this.params.globals,
        dictionary: this.params.dictionary,
        waypoints: this.params.waypoints,
        showPaths: this.params.showPaths,
        zoomLevel: this.params.previousState?.zoomLevel ?? this.params.zoomLevelDefault,
        coordinates: this.params.previousState?.coordinates ?? coordinatesFirstWaypoint,
      },
      {
        onMarkerClick: (waypoint) => {
          this.openWaypointContent(waypoint);
        },
        onWaypointContentOpened: (index) => {
          this.callbacks.onWaypointContentOpened(index);
        },
        onMarkerFocus: (waypoint) => {
          this.callbacks.onMarkerFocus(waypoint);
        },
      },
    );
    this.mapContainer.append(this.geoMap.getDOM());
    this.geoMap.setMapStyle(this.params.mapStyle);

    this.contentOverlay = new ContentOverlay();
    this.mapContainer.append(this.contentOverlay.getDOM());
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Toggle mini map visibility.
   */
  toggleMiniMap() {
    this.geoMap.toggleMiniMapVisibility();
    this.resize();
  }

  /**
   * Resize map.
   */
  resize() {
    this.geoMap.resize();
  }

  /**
   * Reset map.
   */
  reset() {
    this.contentOverlay.hide();
    this.geoMap.reset();
  }

  /**
   * Get waypoint by index.
   * @param {number} index Index of the waypoint.
   * @returns {object} Waypoint.
   */
  getWaypointByIndex(index) {
    return this.geoMap.getWaypointByIndex(index);
  }

  /**
   * Open waypoint content by index.
   * @param {number} index Index of the waypoint.
   * @param {object} options Options.
   * @param {boolean} [options.panTo] Whether to pan to the waypoint.
   */
  openWaypointContentByIndex(index, options = {}) {
    const waypoint = this.getWaypointByIndex(index);
    if (!waypoint) {
      return;
    }

    this.openWaypointContent(waypoint, options);
  }

  /**
   * Open waypoint content.
   * @param {object} waypoint Waypoint.
   * @param {object} options Options.
   * @param {boolean} [options.panTo] Whether to pan to the waypoint.
   */
  openWaypointContent(waypoint, options = {}) {
    if (!waypoint || waypoint.isOpen()) {
      return;
    }

    this.geoMap.setOpenWaypoint(waypoint);

    waypoint.hideContentDOM();
    this.contentOverlay.setContent(waypoint.getContentDOM());
    this.contentOverlay.show();
    window.requestAnimationFrame(() => {
      waypoint.showContentDOM();
    });

    this.callbacks.onWaypointContentOpened(waypoint.getIndex());

    if (options.panTo === false) {
      return;
    }

    this.callbacks.onMarkerFocus(waypoint);
  }

  /**
   * Center map on waypoint.
   * @param {object} waypoint Waypoint.
   * @param {boolean} contentOpen Whether content is open.
   */
  centerOnWaypoint(waypoint, contentOpen = false) {
    if (!waypoint) {
      return;
    }

    const positionXPercentage = contentOpen ? MAP_CENTER_X_PERCENTAGE_CONTENT_OPEN : MAP_CENTER_X_PERCENTAGE;
    this.geoMap.centerOnWaypoint(waypoint.getId(), { positionXPercentage });
  }

  /**
   * Set fullscreen mode.
   * @param {boolean} shouldBeFullScreen True to enter fullscreen, false to exit fullscreen.
   * @param {object} availableSpace Available space for the map.
   */
  setFullscreen(shouldBeFullScreen, availableSpace = {}) {
    if (!availableSpace.width || !availableSpace.height) {
      return;
    }

    this.mapContainer.style.removeProperty('--max-height');
    this.mapContainer.style.removeProperty('--max-width');

    if (!shouldBeFullScreen) {
      return;
    }

    const style = window.getComputedStyle(this.dom);
    const aspectRatio = parseAspectRatio(style.getPropertyValue('--aspectRatio') ?? ASPECT_RATIO_DEFAULT);

    const availableAspectRatio = availableSpace.width / availableSpace.height;
    if (availableAspectRatio > aspectRatio) {
      this.mapContainer.style.setProperty('--max-height', `${availableSpace.height}px`);
    }
    else {
      this.mapContainer.style.setProperty('--max-width', `${availableSpace.width}px`);
    }
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    const coordinates = this.geoMap.getCoordinates();
    coordinates.latitude = coordinates.latitude?.toString();
    coordinates.longitude = coordinates.longitude?.toString();

    return {
      zoomLevel: this.geoMap.getZoomLevel(),
      coordinates: coordinates,
    };
  }

  /**
   * Set current state.
   * @param {object} state State.
   */
  setCurrentState(state = {}) {
    if (state.coordinates?.latitude === undefined || state.coordinates?.longitude === undefined) {
      return;
    }

    this.geoMap.setView(state?.coordinates, state?.zoomLevel);
  }
}
