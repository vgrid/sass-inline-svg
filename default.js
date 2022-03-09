const inliner = require('./index');

export default {
  'svg($path, $selectors: null)': inliner('./', {}),
  'inline-svg($path, $selectors: null)': inliner('./', {})
};
