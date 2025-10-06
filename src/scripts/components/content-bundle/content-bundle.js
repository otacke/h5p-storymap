import { callOnceVisible } from '@services/util.js';
import './content-bundle.scss';

export default class ContentBundle {
  /**
   * @class
   * @param {object} params Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    this.instances = [];

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-story-map-content-bundle');

    this.params.contents.forEach((contentParams) => {
      this.addContent(contentParams.action);
    });
  }

  /**
   * Get DOM element.
   * @returns {HTMLElement} DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   */
  show() {
    this.dom.classList.remove('hidden');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('hidden');
  }

  /**
   * Add content.
   * @param {object} contentParams Content parameters.
   */
  addContent(contentParams) {
    const instanceWrapper = document.createElement('div');
    instanceWrapper.classList.add('h5p-story-map-content-wrapper');

    const instance = H5P.newRunnable(
      contentParams,
      this.params.globals.get('contentId'),
      undefined,
      true,
    );

    if (!instance) {
      console.warn('Failed to create content instance', contentParams);
      return;
    }

    callOnceVisible(instanceWrapper, () => {
      instance.attach(H5P.jQuery(instanceWrapper));

      // The usual workaround for HFP-4289 :-( TODO: Can this be removed already?
      if (instance?.libraryInfo.machineName === 'H5P.Audio') {
        if (!!window.chrome) {
          instance.audio.style.height = '54px';
        }
      }

      // Resize parent when children resize
      this.bubbleUp(instance, 'resize', this.params.globals.get('mainInstance'));

      // Resize children to fit inside parent
      this.bubbleDown(this.params.globals.get('mainInstance'), 'resize', [instance]);
    });

    this.instances.push(instance);

    this.dom.append(instanceWrapper);

    this.params.globals.get('resize')();
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      if (!this.dom.isConnected) {
        return;
      }

      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      if (!this.dom.isConnected) {
        return;
      }

      targets.forEach((target) => {
        target.trigger(eventName, event);
      });
    });
  }
}
