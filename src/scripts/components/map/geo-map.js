import L from 'leaflet';
import MiniMap from 'leaflet-minimap';
import MARKER_SVG from '@assets/marker.svg?inline';
import { extend } from '@services/util.js';
import Waypoint from '@models/waypoint.js';
import { callOnceVisible, sanitizeNumber } from '@services/util.js';
import { isUsingMouse } from '@services/h5p-util.js';

import 'leaflet/dist/leaflet.css';
import './geo-map.scss';

/** @constant {number} LATITUDE_MIN Minimum latitude. */
const LATITUDE_MIN = -90;

/** @constant {number} LATITUDE_MAX Maximum latitude. */
const LATITUDE_MAX = 90;

/** @constant {number} LONGITUDE_MIN Minimum longitude. */
const LONGITUDE_MIN = -180;

/** @constant {number} LONGITUDE_MAX Maximum longitude. */
const LONGITUDE_MAX = 180;

/** @constant {number} DEFAULT_MAP_CENTER_X_PERCENTAGE Default map center X percentage. */
const DEFAULT_MAP_CENTER_X_PERCENTAGE = 0.5;

/** @constant {number} DEFAULT_MAP_CENTER_Y_PERCENTAGE Default map center Y percentage. */
const DEFAULT_MAP_CENTER_Y_PERCENTAGE = 0.5;

/** @constant {number} DEFAULT_ZOOM_LEVEL Default zoom level. */
const DEFAULT_ZOOM_LEVEL = 13;

/** @constant {number[]} DEFAULT_COORDINATES Default coordinates (H5P Group in Tromsø). */
// eslint-disable-next-line
const DEFAULT_COORDINATES = [69.6456737, 18.9501558];

/** @constant {object} MARKER_ICON Marker icon.*/
const MARKER_ICON = L.divIcon({
  html: MARKER_SVG,
  // eslint-disable-next-line
  iconSize: [30, 45],
  // eslint-disable-next-line
  iconAnchor: [15, 45],
  // eslint-disable-next-line
  popupAnchor: [0, -40.5],
  // eslint-disable-next-line
  tooltipAnchor: [0, -39]
});

/** @constant {object} MAP_SERVICES Map services. */
const MAP_SERVICES = {
  cartoDB: {
    urlTemplate: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
    options: {
      // eslint-disable-next-line
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    },
  },
  esriNATGeoWorldMap: {
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
    options: {
      // eslint-disable-next-line
      attribution: '&copy; Esri, USGS &mdash; Esri, TomTom, FAO, NOAA, USGS &mdash; National Geographic, Esri, Garmin, HERE, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, increment P Corp.',
      maxZoom: 12,
    },
  },
  esriWorldPhysicalMap: {
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
    options: {
      attribution: '&copy; Esri, USGS &mdash; Esri, TomTom, FAO, NOAA, USGS &mdash; US National Park Service',
      maxZoom: 8,
    },
  },
  esriWorldTopoMap: {
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    options: {
      // eslint-disable-next-line
      attribution: '&copy; Esri, NLS, NMA, USGS &mdash; Source: Esri, TomTom, Garmin, METI/NASA, USGS | Esri, HERE, Garmin, USGS, METI/NASA, NGA'
    },
  },
  openStreetMap: {
    urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    },
  },
  openTopoMap: {
    urlTemplate: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    options: {
      // eslint-disable-next-line
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, SRTM | &copy; <a href="http://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">(CC BY-SA 3.0)</a>)',
      maxZoom: 17,
    },
  },
};

export default class GeoMap {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callback functions.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({
      waypoints: [],
      coordinates: {},
    }, params);


    this.params.zoomLevel = sanitizeNumber(this.params.zoomLevel, DEFAULT_ZOOM_LEVEL);
    this.params.coordinates.latitude =
      sanitizeNumber(this.params.coordinates?.latitude, DEFAULT_COORDINATES[0], LATITUDE_MIN, LATITUDE_MAX);
    this.params.coordinates.longitude =
      sanitizeNumber(this.params.coordinates?.longitude, DEFAULT_COORDINATES[1], LONGITUDE_MIN, LONGITUDE_MAX);

    this.callbacks = extend({
      onMarkerClick: () => {},
      onWaypointContentOpened: () => {},
      onMarkerFocus: () => {},
    }, callbacks);

    this.waypoints = [];
    this.paths = [];

    this.buildDOM();
    this.buildMap();

    // Ensure map is properly rendered if used in different contexts, e.g. in editor widget for preview
    callOnceVisible(this.dom, () => {
      this.map.invalidateSize();
    });
  }

  /**
   * Build DOM elements for the map.
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.className = 'geo-map';
    this.dom.setAttribute('aria-label', this.params.dictionary.get('a11y.mapInstructions'));
    this.dom.setAttribute('role', 'application');
  }

  /**
   * Build the map.
   */
  buildMap() {
    this.map = L.map(this.dom);
    this.setView(this.params.coordinates, this.params.zoomLevel);

    this.map.on('movestart', () => {
      this.waypoints.forEach((waypoint) => {
        waypoint.hideTooltip();
      });
    });

    this.params.waypoints.forEach((waypointParams, index) => {
      waypointParams.index = index;
      this.addWaypoint(waypointParams);
    });

    if (this.params.showPaths) {
      this.connectMarkersWithPaths();
    }

    this.dom.append(this.map);

    this.overrideLeafletZoomButtons();
  }

  /**
   * Add a waypoint to the map.
   * @param {object} params Parameters for the waypoint.
   * @returns {Waypoint|null|undefined} The created waypoint or null if not created.
   */
  addWaypoint(params = {}) {
    const marker = L.marker([params.latitude, params.longitude], { icon: MARKER_ICON });
    marker.addTo(this.map);

    const markerDOM = marker.getElement();

    const ariaLabel = this.params.dictionary.get('a11y.openContent').replace('@title', params.title);
    markerDOM.setAttribute('aria-label', ariaLabel);
    const tooltip = H5P.Tooltip?.(markerDOM, { position: 'bottom' });

    const waypoint = new Waypoint(
      {
        globals: this.params.globals,
        dictionary: this.params.dictionary,
        marker: marker,
        waypointParams: {
          index: params.index,
          id: params.id || H5P.createUUID(),
          latitude: params.latitude,
          longitude: params.longitude,
          title: params.title,
          contents: params.contents || [],
        },
        tooltip: tooltip,
      },
    );
    this.waypoints.push(waypoint);

    marker.on('keydown', (event) => {
      if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') {
        this.callbacks.onMarkerClick(waypoint);
        waypoint.hideTooltip();
      }
    });

    marker.on('click', () => {
      this.callbacks.onMarkerClick(waypoint);
    });

    markerDOM.addEventListener('focus', () => {
      // Cathing focus inhibits click event with leaflet
      if (isUsingMouse() || isUsingMouse('.h5peditor-storymap')) {
        this.callbacks.onMarkerClick(waypoint);
      }
      else {
        this.callbacks.onMarkerFocus(waypoint);
      }
    });

    return waypoint;
  }

  /**
   * Connect markers with paths.
   */
  connectMarkersWithPaths() {
    for (let i = 0; i < this.waypoints.length; i++) {
      if (i === 0) {
        continue;
      }

      this.addPath(this.waypoints[i - 1].getMarker().getLatLng(), this.waypoints[i].getMarker().getLatLng());
    }
  }

  /**
   * Remove all paths.
   */
  removeAllPaths() {
    this.paths.forEach((path) => {
      this.removePath(path);
    });
  }

  /**
   * Remove path from the map and internal list.
   * @param {L.Polyline} path Path to remove.
   */
  removePath(path) {
    this.map.removeLayer(path);
    this.paths = this.paths.filter((p) => p !== path);
  }

  /**
   * Add path between two points.
   * @param {L.LatLng} latLng1 First point.
   * @param {L.LatLng} latLng2 Second point.
   */
  addPath(latLng1, latLng2) {
    const path = L.polyline([latLng1, latLng2]);
    path.addTo(this.map);
    this.paths.push(path);
  }

  /**
   * Override leaflet's zoom buttons to make translatable.
   */
  overrideLeafletZoomButtons() {
    const zoomInButton = this.dom.querySelector('.leaflet-control-zoom-in');
    zoomInButton.setAttribute('aria-label', this.params.dictionary.get('a11y.buttonZoomIn'));
    zoomInButton.removeAttribute('title');
    H5P.Tooltip?.(zoomInButton, { position: 'right' });

    const zoomOutButton = this.dom.querySelector('.leaflet-control-zoom-out');
    zoomOutButton.setAttribute('aria-label', this.params.dictionary.get('a11y.buttonZoomOut'));
    zoomOutButton.removeAttribute('title');
    H5P.Tooltip?.(zoomOutButton, { position: 'right' });
  }

  /**
   * Set view of the map.
   * @param {object} coordinates Coordinates to center on ({ latitude: number, longitude: number }).
   * @param {number} zoomLevel Zoom level.
   */
  setView(coordinates = {}, zoomLevel) {
    const latitude = sanitizeNumber(coordinates.latitude, DEFAULT_COORDINATES[0], LATITUDE_MIN, LATITUDE_MAX);
    const longitude = sanitizeNumber(coordinates.longitude, DEFAULT_COORDINATES[1], LONGITUDE_MIN, LONGITUDE_MAX);
    zoomLevel = sanitizeNumber(zoomLevel, DEFAULT_ZOOM_LEVEL, this.map.getMinZoom(), this.map.getMaxZoom());

    this.map.setView([latitude, longitude], zoomLevel, { animate: false });
  }

  getCoordinates() {
    const center = this.map.getCenter();
    return {
      latitude: center.lat,
      longitude: center.lng,
    };
  }

  /**
   * Center the map on waypoint with a certain ID.
   * @param {string} id ID of the waypoint to center on.
   * @param {object} options Options for centering.
   */
  centerOnWaypoint(id, options = {}) {
    const mapSize = this.getSize();
    if (mapSize.width === 0 || mapSize.height === 0) {
      return; // Map is not visible, do nothing.
    }

    options.positionXPercentage = sanitizeNumber(options.positionXPercentage, DEFAULT_MAP_CENTER_X_PERCENTAGE, 0, 1);
    options.positionYPercentage = sanitizeNumber(options.positionYPercentage, DEFAULT_MAP_CENTER_Y_PERCENTAGE, 0, 1);

    const waypoint = this.getWaypointById(id);
    if (!waypoint) {
      return;
    }

    const markerLatLng = waypoint.getMarker().getLatLng();

    const targetPoint = L.point(
      mapSize.width * options.positionXPercentage,
      mapSize.height * options.positionYPercentage,
    );

    const markerPoint = this.map.latLngToContainerPoint(markerLatLng);

    const offset = targetPoint.subtract(markerPoint);

    const centerLatLng = this.map.getCenter();
    const centerPoint = this.map.latLngToContainerPoint(centerLatLng);
    const newCenterPoint = centerPoint.subtract(offset);

    const newCenterLatLng = this.map.containerPointToLatLng(newCenterPoint);

    this.panTo({ latitude: newCenterLatLng.lat, longitude: newCenterLatLng.lng }, options);
  }

  panTo(coordinates = {}, options = {}) {
    if (typeof coordinates.latitude !== 'number' || typeof coordinates.longitude !== 'number') {
      return;
    }

    const latitude = sanitizeNumber(coordinates.latitude, DEFAULT_COORDINATES[0], LATITUDE_MIN, LATITUDE_MAX);
    const longitude = sanitizeNumber(coordinates.longitude, DEFAULT_COORDINATES[1], LONGITUDE_MIN, LONGITUDE_MAX);

    if (options.zoomLevel) {
      this.map.once('moveend', () => {
        this.map.setZoom(options.zoomLevel, { animate: true });
      });
    }

    this.map.panTo([latitude, longitude]);
  }

  /**
   * Get current zoom level.
   * @returns {number} Current zoom level.
   */
  getZoomLevel() {
    return this.map.getZoom();
  }

  /**
   * Reset map.
   */
  reset() {
    if (!this.waypoints) {
      this.map.setZoom(this.params.zoomLevel);
      return;
    }

    this.waypoints.forEach((waypoint) => {
      waypoint.setOpen(false);
    });

    if (!this.waypoints.length) {
      return;
    }

    this.centerOnWaypoint(this.waypoints[0].getId(), { zoomLevel: this.params.zoomLevel });
  }

  /**
   * Get waypoint by index.
   * @param {number} index Index of the waypoint to get.
   * @returns {object|null} Waypoint object or null if not found.
   */
  getWaypointByIndex(index) {
    if (typeof index !== 'number' || index < 0 || index >= this.waypoints.length) {
      return null;
    }

    return this.waypoints.find((waypoint) => waypoint.getIndex() === index);
  }

  /**
   * Get waypoint by ID.
   * @param {string} id ID of the waypoint to get.
   * @returns {object|null} Waypoint object or null if not found.
   */
  getWaypointById(id) {
    return this.waypoints.find((waypoint) => waypoint.getId() === id);
  }

  /**
   * Get the DOM element of the map.
   * @returns {HTMLElement} The DOM element of the map.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Resize map.
   */
  resize() {
    window.clearTimeout(this.pinWrapperTimeout);
    this.pinWrapperTimeout = window.requestAnimationFrame(() => {
      this.updateSizeProperties();
    });
  }

  /**
   * Update size properties to be used by children.
   */
  updateSizeProperties() {
    const { height, width } = this.getSize();

    this.dom.style.setProperty('--waypoint-area-computed-width', `${width}px`);
    this.dom.style.setProperty('--waypoint-area-computed-height', `${height}px`);
  }

  /**
   * Get board size.
   * @returns {object} Height and width of board.
   */
  getSize() {
    const clientRect = this.dom.getBoundingClientRect();
    return { height: clientRect.height, width: clientRect.width };
  }

  /**
   * Set map style.
   * @param {object} mapStyle Map style ({ value: string, label: string }).
   */
  setMapStyle(mapStyle) {
    if (!MAP_SERVICES[mapStyle]) {
      return;
    }

    const mapServiceData = MAP_SERVICES[mapStyle];

    if (this.tileLayer) {
      this.map.removeLayer(this.tileLayer);
    }

    this.tileLayer = L.tileLayer(mapServiceData.urlTemplate, mapServiceData.options);
    this.tileLayer.addTo(this.map);

    if (this.miniMapLayer) {
      this.map.removeLayer(this.miniMapLayer);
      this.dom.querySelector('.leaflet-control-minimap')?.remove(); // Removing layer fails (?)
    }

    this.miniMapLayer = new L.TileLayer(mapServiceData.urlTemplate, mapServiceData.options);
    this.miniMap = new MiniMap(this.miniMapLayer, {
      height: '', // Allows to use CSS without restriction to px and without !important
      width: '', // Allows to use CSS without restriction to px and without !important
      position: 'bottomleft',
    });

    this.miniMap.addTo(this.map);

    if (this.miniMapVisible === undefined) {
      this.toggleMiniMapVisibility(false);
    }
  }

  /**
   * Toggle mini map visibility.
   * @param {boolean} state True to show mini map, false to hide.
   */
  toggleMiniMapVisibility(state) {
    this.miniMapVisible = (typeof state === 'boolean') ? state : !this.miniMapVisible;

    this.dom.querySelector('.leaflet-control-minimap')?.classList.toggle('visibility-hidden', !this.miniMapVisible);
  }

  /**
   * Toggle path visibility.
   * @param {boolean} showPaths True to show paths.
   */
  togglePathVisibility(showPaths) {
    if (showPaths) {
      this.dom.style.setProperty('--path-color', 'var(--path-color-active)');
      this.dom.style.setProperty('--path-stroke-dash', 'var(--path-stroke-dash-active)');
    }
    else {
      this.dom.style.setProperty('--path-color', 'var(--path-color-inactive)');
      this.dom.style.setProperty('--path-stroke-dash', 'var(--path-stroke-dash-inactive)');
    }
  }

  /**
   * Set open waypoint and close others.
   * @param {object} waypoint Waypoint to open.
   */
  setOpenWaypoint(waypoint) {
    this.waypoints.forEach((waypointToOpen) => {
      waypointToOpen.setOpen(waypointToOpen === waypoint);
    });
  }
}
