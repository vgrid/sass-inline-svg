// @ts-check
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as sass from 'sass';

import { parseDocument } from 'htmlparser2';
import { selectAll, selectOne } from 'css-select';
import serialize from 'dom-serializer';
import svgToDataUri from 'mini-svg-data-uri';
import { optimize } from 'svgo';

const defaultOptions = {
  encodingFormat: 'base64',
  optimize: false
};

/**
 * The SVG inliner function
 * This is a factory that expects a base path abd returns the actual function
 *
 * @param {string} base
 * @param {object} [opts]
 * @param {string} [opts.encodingFormat]
 * @param {boolean} [opts.optimize]
 * @returns {sass.CustomFunction<'async'>}
 */
export default function inliner(base, opts) {
  const options = {
    ...defaultOptions,
    ...opts
  };

  /**
   * @param {sass.Value[]} args
   * @returns {Promise<sass.SassString>}
   */
  return async function (args) {
    const path = /** @type {sass.SassString} */ (args[0]);
    const selectors = /** @type {sass.Value | undefined} */ (args[1]);
    try {
      const resolvedPath = resolve(base, path.text);
      let content = await readFile(resolvedPath, 'utf8');

      const mapSelectors = selectors?.tryMap();

      if (mapSelectors) {
        content = changeStyle(content, mapSelectors);
      }

      if (options.optimize) {
        content = optimize(content).data;
      }

      return encode(content, options.encodingFormat);
    } catch (err) {
      console.log(err);
      return new sass.SassString('');
    }
  };
}

/**
 * Encode the string
 *
 * @param {string} content
 * @param {string} encodingFormat
 * @returns {sass.SassString}
 */
function encode(content, encodingFormat) {
  const buffer = Buffer.from(content, 'utf-8');

  if (encodingFormat === 'uri') {
    return new sass.SassString(`url("${svgToDataUri(buffer.toString('utf-8'))}")`, { quotes: false });
  }

  if (encodingFormat === 'base64') {
    return new sass.SassString(`url("data:image/svg+xml;base64,${buffer.toString('base64')}")`, { quotes: false });
  }

  throw new Error(`encodingFormat "${encodingFormat}" is not supported`);
}

/**
 * Change the style attributes of an SVG string.
 *
 * @param {string} source
 * @param {sass.SassMap} selectorsMap
 * @returns {*}
 */
function changeStyle(source, selectorsMap) {
  const document = parseDocument(source, {
    xmlMode: true
  });
  const svg = document ? selectOne('svg', document.childNodes) : null;

  const selectors = mapToObj(selectorsMap);

  if (!svg) {
    throw Error('Invalid svg file');
  }

  Object.keys(selectors).forEach(function (selector) {
    const elements = selectAll(selector, svg);
    const newAttributes = selectors[selector];

    elements.forEach(function (element) {
      // @ts-ignore -- attribs property does exist
      Object.assign(element.attribs, newAttributes);
    });
  });

  return serialize(document);
}

/**
 * Recursively transforms a Sass map into a JS object.
 *
 * @param {sass.SassMap} sassMap
 * @returns {Record<any, any>}
 */
function mapToObj(sassMap) {
  const obj = Object.create(null);
  const map = sassMap.contents.toJS();

  for (const [key, value] of /** @type {[string, sass.Value][]} */ (Object.entries(map))) {
    if (value instanceof sass.SassMap) {
      obj[key] = mapToObj(value);
    } else if (value instanceof sass.SassColor) {
      const r = Math.round(value.channel('red'));
      const g = Math.round(value.channel('green'));
      const b = Math.round(value.channel('blue'));
      const a = value.channel('alpha');
      obj[key] = a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${+a.toFixed(3)})`; // Limit alpha precision
    } else {
      obj[key] = value.toString();
    }
  }

  return obj;
}
