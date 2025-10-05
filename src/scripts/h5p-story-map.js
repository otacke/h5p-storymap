import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
import H5PUtil from '@services/h5p-util.js';
import { extend, formatLanguageCode } from '@services/util.js';
import Main from '@components/main.js';

import '@styles/h5p-story-map.scss';

/** @constant {string} DEFAULT_DESCRIPTION Default description*/
const DEFAULT_DESCRIPTION = 'Story Map';

/** @constant {number} FULL_SCREEN_DELAY Time some browsers need to go to full screen. */
const FULL_SCREEN_DELAY = 300;

// TODO: Clean up code

export default class StoryMap extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    this.params = extend(H5PUtil.getSemanticsDefaults(), params);

    this.contentId = contentId;
    this.extras = extend({
      previousState: {},
    }, extras);

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    const isFullscreenSupported = this.isRoot() && H5P.fullscreenSupported;

    // Set globals
    this.globals = new Globals();
    this.globals.set('contentId', this.contentId);
    this.globals.set('mainInstance', this);
    this.globals.set('isFullscreenSupported', isFullscreenSupported);
    this.globals.set('resize', () => {
      this.trigger('resize');
    });

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = formatLanguageCode(defaultLanguage);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-story-map');

    this.main = new Main(
      {
        behaviour: this.params.behaviour,
        dictionary: this.dictionary,
        globals: this.globals,
        map: this.params.editor,
        visual: this.params.visual,
      },
      {
        onRequestFullScreen: () => {
          this.toggleFullScreen();
        },
      },
    );
    this.dom.appendChild(this.main.getDOM());

    if (isFullscreenSupported) {
      this.setupFullscreenHandlers();
    }

    this.setCurrentState(this.extras.previousState);
  }

  /**
   * Set up handlers for fullscreen changes.
   */
  setupFullscreenHandlers() {
    this.on('enterFullScreen', () => {
      window.setTimeout(() => {
        this.main.setFullscreen(true);
      }, FULL_SCREEN_DELAY);
    });

    this.on('exitFullScreen', () => {
      this.main.setFullscreen(false);
    });

    const recomputeDimensions = () => {
      if (H5P.isFullscreen) {
        window.clearTimeout(this.recomputeDimensionsTimeout);
        this.recomputeDimensionsTimeout = window.setTimeout(() => { // Needs time to rotate for window.innerHeight
          this.main.setFullscreen(H5P.isFullscreen);
        }, FULL_SCREEN_DELAY);
      }
    };

    this.on('resize', () => {
      recomputeDimensions();
    });

    // Resize fullscreen dimensions when rotating screen
    if (screen?.orientation?.addEventListener) {
      screen?.orientation?.addEventListener('change', () => {
        recomputeDimensions();
      });
    }
    else {
      /*
      * `orientationchange` is deprecated, but guess what browser doesn't
      * support the Screen Orientation API ... From something with fruit.
      */
      window.addEventListener('orientationchange', () => {
        recomputeDimensions();
      }, false);
    }
  }

  /**
   * Attach DOM to H5P wrapper.
   * @param {H5P.jQuery} $wrapper H5P wrapper.
   */
  attach($wrapper) {
    $wrapper.get(0).append(this.dom);

    this.on('resize', () => {
      this.main.resize();
    });
  }

  /**
   * Get tasks title.
   * @returns {string} Title.
   */
  getTitle() {
    let raw;
    if (this.extras.metadata) {
      raw = this.extras.metadata.title;
    }
    raw = raw || DEFAULT_DESCRIPTION;

    // H5P Core function: createTitle
    return H5P.createTitle(raw);
  }

  /**
   * Get tasks description.
   * @returns {string} Description.
   */
  getDescription() {
    return this.params.taskDescription || DEFAULT_DESCRIPTION;
  }

  /**
   * Get context data. Contract used for confusion report.
   * @returns {object} Context data.
   */
  getContext() {
    return {
      type: 'waypoint',
      value: this.main.getCurrentOpenWaypointContentIndex(),
    };
  }

  /**
   * Toggle full screen.
   * @param {boolean} [shouldBeFullScreen] True to enter fullscreen, false to exit fullscreen.
   */
  toggleFullScreen(shouldBeFullScreen) {
    if (!this.dom) {
      return;
    }

    if (typeof shouldBeFullScreen !== 'boolean') {
      shouldBeFullScreen = !H5P.isFullscreen;
    }

    if (shouldBeFullScreen) {
      this.container = this.container || this.dom.closest('.h5p-container');
      if (this.container) {
        H5P.fullScreen(H5P.jQuery(this.container), this);
      }
    }
    else {
      H5P.exitFullScreen();
    }
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.main.reset();
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return this.main.getCurrentState();
  }

  /**
   * Set current state.
   * Candidate for question type contract in H5P core.
   * @param {object} state State to set, must match return value from getCurrentState.
   */
  setCurrentState(state = {}) {
    this.main.setCurrentState(state);
  }
}
