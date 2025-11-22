/**
 * Add mixins to a class, useful for splitting files.
 * @param {object} [master] Master class to add mixins to.
 * @param {object[]|object} [mixins] Mixins to be added to master.
 */
export const addMixins = (master = {}, mixins = []) => {
  if (!master.prototype) {
    return;
  }

  if (!Array.isArray(mixins)) {
    mixins = [mixins];
  }

  const masterPrototype = master.prototype;

  mixins.forEach((mixin) => {
    const mixinPrototype = mixin.prototype;
    Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
      if (property === 'constructor') {
        return; // Don't need constructor
      }

      if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
        return; // property already present, do not override
      }

      masterPrototype[property] = mixinPrototype[property];
    });
  });
};

/**
 * Extend an array just like JQuery's extend.
 * @param {...object} args Objects to merge.
 * @returns {object} Merged objects.
 */
export const extend = (...args) => {
  for (let i = 1; i < args.length; i++) {
    for (let key in args[i]) {
      if (Object.prototype.hasOwnProperty.call(args[i], key)) {
        if (
          typeof args[0][key] === 'object' &&
          typeof args[i][key] === 'object'
        ) {
          extend(args[0][key], args[i][key]);
        }
        else if (args[i][key] !== undefined) {
          args[0][key] = args[i][key];
        }
      }
    }
  }
  return args[0];
};

/**
 * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
 * Cmp. https://tools.ietf.org/html/rfc5646
 * @param {string} languageCode Language tag.
 * @returns {string} Formatted language tag.
 */
export const formatLanguageCode = (languageCode) => {
  if (typeof languageCode !== 'string') {
    return languageCode;
  }

  /*
    * RFC 5646 states that language tags are case insensitive, but
    * recommendations may be followed to improve human interpretation
    */
  const segments = languageCode.split('-');
  segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
  if (segments.length > 1) {
    segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
  }
  languageCode = segments.join('-');

  return languageCode;
};

/**
 * Call a callback once the given DOM element is visible in the viewport.
 * @param {object} dom DOM element to observe.
 * @param {function} callback Callback to call once visible.
 * @param {object} [options] Options.
 * @param {object} [options.root] Root element for intersection observer.
 * @param {number} [options.threshold] Threshold for intersection observer.
 * @returns {Promise<object>} Promise resolving with the created IntersectionObserver.
 */
export const callOnceVisible = async (dom, callback, options = {}) => {
  if (typeof dom !== 'object' || typeof callback !== 'function') {
    return; // Invalid arguments
  }

  options.threshold = options.threshold || 0;

  return await new Promise((resolve) => {
    // iOS is behind ... Again ...
    const idleCallback = window.requestIdleCallback ?
      window.requestIdleCallback :
      window.requestAnimationFrame;

    idleCallback(() => {
      // Get started once visible and ready
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          observer.unobserve(dom);
          observer.disconnect();

          callback();
        }
      }, {
        ...(options.root && { root: options.root }),
        threshold: options.threshold,
      });
      observer.observe(dom);

      resolve(observer);
    });
  });
};

/**
 * Sanitize number. Will try to interpret strings as numbers.
 * @param {number} value Value to sanitize.
 * @param {number} defaultValue Default value if value is not a number.
 * @param {number} [min] Minimum value.
 * @param {number} [max] Maximum value.
 * @returns {number} Sanitized number.
 */
export const sanitizeNumber = (value, defaultValue, min, max) => {
  let result = value;

  if (typeof value === 'string') {
    result = parseFloat(value);
    if (result.toString() !== value.trim()) {
      result = NaN;
    }
  }

  if (typeof result !== 'number' || Number.isNaN(result)) {
    if (typeof defaultValue !== 'number') {
      throw new Error('Invalid default value');
    }
    return defaultValue;
  }

  if (typeof min === 'number' && result < min) {
    return min;
  }

  if (typeof max === 'number' && result > max) {
    return max;
  }

  return result;
};

/**
 * Parse CSS aspect ratio value.
 * @param {string|number} value Aspect ratio value.
 * @returns {number|null} Parsed aspect ratio or null if invalid.
 */
export const parseAspectRatio = (value) => {
  const VALID_NUMBER_OF_SEGMENTS = 2;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  if (value.includes('/')) {
    const segments = value.split('/');
    if (segments.length !== VALID_NUMBER_OF_SEGMENTS) {
      return null;
    }

    const width = parseFloat(segments[0]);
    const height = parseFloat(segments[1]);

    if (Number.isNaN(width) || !Number.isFinite(width) || width <= 0 ||
      Number.isNaN(height) || !Number.isFinite(height) || height <= 0) {
      return null;
    }

    return width / height;
  }

  const floatValue = parseFloat(value);
  if (!Number.isNaN(floatValue) && Number.isFinite(floatValue)) {
    return floatValue;
  }

  return null;
};
