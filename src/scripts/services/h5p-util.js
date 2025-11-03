import semantics from '@root/semantics.json';

/**
 * Get default values from semantics fields.
 * @param {object[]} start Start semantics field.
 * @returns {object} Default values from semantics.
 */
export const getSemanticsDefaults = (start = semantics) => {
  let defaults = {};

  if (!Array.isArray(start)) {
    return defaults; // Must be array, root or list
  }

  start.forEach((entry) => {
    if (typeof entry.name !== 'string') {
      return;
    }

    if (typeof entry.default !== 'undefined') {
      defaults[entry.name] = entry.default;
    }
    if (entry.type === 'list') {
      defaults[entry.name] = []; // Does not set defaults within list items!
    }
    else if (entry.type === 'group' && entry.fields) {
      const groupDefaults = getSemanticsDefaults(entry.fields);
      if (Object.keys(groupDefaults).length) {
        defaults[entry.name] = groupDefaults;
      }
    }
  });

  return defaults;
};

/**
 * Determine whether the H5P editor is being used.
 * @returns {boolean} True if the H5P editor is being used, false otherwise.
 */
export const isEditor = () => {
  return window.H5PEditor !== undefined;
};

/**
 * Determine whether an H5P instance is a task.
 * @param {H5P.ContentType} instance Instance.
 * @returns {boolean} True, if instance is a task.
 */
export const isInstanceTask = (instance = {}) => {
  if (!instance) {
    return false;
  }

  if (typeof instance.isTask === 'boolean') {
    return instance.isTask; // Content will determine if it's task on its own
  }

  // Check for maxScore > 0 as indicator for being a task
  const hasGetMaxScore = (typeof instance.getMaxScore === 'function');
  if (hasGetMaxScore && instance.getMaxScore() > 0) {
    return true;
  }

  return false;
};

/**
 * Check if the user is using a mouse.
 * @param {string} [selector] The selector to check for the using-mouse class.
 * @param {Document} [baseDocument] The document to check.
 * @returns {boolean|undefined} Undefined if cannot be determined, True if the user is using a mouse, false otherwise.
 */
export const isUsingMouse = (selector = '.h5p-content', baseDocument) => {
  return (baseDocument ?? document).querySelector(selector)?.classList.contains('using-mouse');
};
