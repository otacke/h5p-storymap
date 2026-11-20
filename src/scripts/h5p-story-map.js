import Dictionary from '@services/dictionary.js';
import { isEditor, getSemanticsDefaults } from '@services/h5p-util.js';
import { addMixins, extend, formatLanguageCode } from '@services/util.js';
import Main from '@components/main.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';

import '@styles/h5p-story-map.scss';

export default class StoryMap extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    addMixins(StoryMap, [QuestionTypeContract, XAPI]);

    this.params = extend(getSemanticsDefaults(), params);

    this.contentId = contentId;
    this.extras = extend({
      previousState: {},
    }, extras);

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    const isFullscreenSupported = this.isRoot() && H5P.fullscreenSupported;

    // Set globals
    this.globals = new Map();
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
        previousState: this.extras.previousState ?? {},
      },
      {
        onRequestFullScreen: () => {
          this.toggleFullScreen();
        },
        onCompleted: () => {
          this.handleUserCompleted();
        },
        onProgressed: (waypointIndex) => {
          this.handleUserProgress(waypointIndex);
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
   * Workaround for H5P core mutating prototype to inject its isRoot, but ES6 inheritance here.
   * @returns {boolean} True, if content type is root. Else false.
   */
  isRoot() {
    return !!this.extras.standalone;
  }

  /**
   * Set up handlers for fullscreen changes.
   */
  setupFullscreenHandlers() {
    /*
     * Layout is handled by CSS. Device rotation and other viewport changes
     * trigger H5P's resize event, which keeps the map in sync.
     */
    this.on('enterFullScreen', () => {
      this.setFullscreen(true);
    });

    this.on('exitFullScreen', () => {
      this.setFullscreen(false);
    });
  }

  /**
   * Set fullscreen state.
   * @param {boolean} shouldBeFullScreen True for fullscreen, false otherwise.
   */
  setFullscreen(shouldBeFullScreen) {
    this.dom.classList.toggle('h5p-story-map-fullscreen', shouldBeFullScreen);
    this.main.setFullscreen(shouldBeFullScreen);
  }

  /**
   * Attach DOM to H5P wrapper.
   * @param {H5P.jQuery} $wrapper H5P wrapper.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-theme');
    $wrapper.get(0).append(this.dom);

    this.on('resize', () => {
      this.main.resize();
    });
  }

  /**
   * Handle user completed.
   */
  handleUserCompleted() {
    if (isEditor()) {
      return; // Don't send xAPI events when in editor.
    }

    this.triggerXAPIEvent('completed');
  }

  /**
   * Handle user progress and trigger xAPI event.
   * @param {number} waypointIndex Index of waypoint user progressed to.
   */
  handleUserProgress(waypointIndex) {
    if (window.H5PEditor) {
      return; // Don't send xAPI events when in editor.
    }

    const xAPIEvent = this.createXAPIEvent('progressed');
    xAPIEvent.data.statement.object.definition
      .extensions['http://id.tincanapi.com/extension/ending-point'] = waypointIndex + 1;
    this.trigger(xAPIEvent);
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
   * Set current state.
   * Candidate for question type contract in H5P core.
   * @param {object} state State to set, must match return value from getCurrentState.
   */
  setCurrentState(state = {}) {
    this.main.setCurrentState(state);
  }
}
