import { isInstanceTask } from '@services/h5p-util.js';
import { callOnceVisible, extend } from '@services/util.js';
import './content-bundle.scss';

export default class ContentBundle {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = extend({}, params);
    this.callbacks = extend({
      onTaskCompleted: () => {},
    }, callbacks);

    this.instances = [];
    this.trackingMap = {};

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-story-map-content-bundle');

    this.params.contents.forEach((contentParams, index) => {
      this.addContent(contentParams.action, index);
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

    window.requestAnimationFrame(() => {
      this.params.globals.get('resize')();
    });
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
   * @param {number} index Index.
   */
  addContent(contentParams, index) {
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

    if (isInstanceTask(instance)) {
      instance.on('xAPI', (event) => {
        if (typeof event.getMaxScore() !== 'number') {
          return;
        }

        const xAPIVerb = event.getVerb();
        if (xAPIVerb !== 'completed' && xAPIVerb !== 'answered') {
          return;
        }

        const result = event.getVerifiedStatementValue(['result']) ?? {};

        this.trackingMap[index] = {
          completed: result.completion ?? true,
          success: result.success ?? (result.maxScore) ? ((result.score ?? 0) >= result.maxScore) : false,
        };

        this.callbacks.onTaskCompleted();
      });
    }
    else {
      this.trackingMap[index] = { isTask: false, completed: true, success: true };
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

      instance.trigger('resize');
    });

    this.instances.push(instance);

    this.dom.append(instanceWrapper);

    this.params.globals.get('resize')();
  }

  /**
   * Determine whether the content bundle contains any tasks.
   * @returns {boolean} True if the content bundle contains any tasks.
   */
  containsAnyTask() {
    return this.instances.some((instance) => isInstanceTask(instance));
  }

  /**
   * Determine whether all tasks are completed.
   * @returns {boolean} True if all tasks are completed.
   */
  isCompleted() {
    return this.instances.length === Object.keys(this.trackingMap).length &&
      Object.values(this.trackingMap).every((entry) => entry.completed);
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

  /**
   * Get score.
   * @returns {number} Score.
   */
  getScore() {
    return this.instances.reduce((total, instance) => {
      return total + (instance?.getScore?.() || 0);
    }, 0);
  }

  /**
   * Get maximum score.
   * @returns {number} Maximum score.
   */
  getMaxScore() {
    return this.instances.reduce((total, instance) => {
      return total + (instance?.getMaxScore?.() || 0);
    }, 0);
  }

  /**
   * Show solutions for all child question types.
   */
  showSolutions() {
    this.instances.forEach((instance) => {
      instance?.showSolutions?.();
    });
  }

  /**
   * Reset all child question types.
   */
  reset() {
    this.instances.forEach((instance) => {
      instance?.resetTask?.();
    });

    for (const index in this.trackingMap) {
      if (this.trackingMap[index].isTask !== false) {
        delete this.trackingMap[index];
      }
    }
  }
}
