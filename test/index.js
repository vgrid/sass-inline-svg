// @ts-check
import * as sass from 'sass-embedded';
import svg from '../index.js';
import { expect } from 'chai';
import fs from 'fs';
import { resolve } from 'path';
import encodeMiniUri from 'mini-svg-data-uri';

const __dirname = import.meta.dirname;

describe('test svg inliner', function () {
  describe('modern api', function () {
    it('should inline svg image as base64', async function () {
      const result = await sass.compileStringAsync('.sass{background: svg("test.svg");}', {
        functions: {
          'svg($path, $selectors: null)': svg(__dirname)
        }
      });
      const expectedResult = fs.readFileSync(resolve(__dirname, 'test.svg')).toString('base64');

      expect(result.css.toString()).to.equal(
        `.sass {\n  background: url("data:image/svg+xml;base64,${expectedResult}");\n}`
      );
    });

    it('should inline svg image as uri', async function () {
      const result = await sass.compileStringAsync('.sass{background: svg("test.svg");}', {
        functions: {
          'svg($path, $selectors: null)': svg(__dirname, {
            encodingFormat: 'uri'
          })
        }
      });
      const expectedResult = encodeMiniUri(fs.readFileSync(resolve(__dirname, 'test.svg')).toString('utf-8'));

      expect(result.css.toString()).to.equal(`.sass {\n  background: url("${expectedResult}");\n}`);
    });

    it('should apply style to svg image', async function () {
      const result = await sass.compileStringAsync(
        '.sass{background: svg("path-optimized.svg", (path: (fill: #000)));}',
        {
          functions: {
            'svg($path, $selectors: null)': svg(__dirname)
          }
        }
      );
      const expectedResult = Buffer.from(
        '<svg height="210" width="400"><path fill="rgb(0,0,0)" d="M150 0L75 200h150z"/></svg>\n',
        'utf8'
      ).toString('base64');

      expect(result.css.toString()).to.equal(
        `.sass {\n  background: url("data:image/svg+xml;base64,${expectedResult}");\n}`
      );
    });

    it('should apply alpha value if set in the colour', async function () {
      const result = await sass.compileStringAsync(
        '.sass{background: svg("path-optimized.svg", (path: (fill: rgba(0,0,0,0.5))));}',
        {
          functions: {
            'svg($path, $selectors: null)': svg(__dirname)
          }
        }
      );
      const expectedResult = Buffer.from(
        '<svg height="210" width="400"><path fill="rgba(0,0,0,0.5)" d="M150 0L75 200h150z"/></svg>\n',
        'utf8'
      ).toString('base64');

      expect(result.css.toString()).to.equal(
        `.sass {\n  background: url("data:image/svg+xml;base64,${expectedResult}");\n}`
      );
    });

    it('should optimize svg', async function () {
      const result = await sass.compileStringAsync('.sass{background: svg("path.svg")}', {
        functions: {
          'svg($path, $selectors: null)': svg(__dirname, {
            optimize: true
          })
        }
      });
      const expectedResult = Buffer.from(
        '<svg width="400" height="210"><path fill="red" d="M150 0 75 200h150Z"/></svg>',
        'utf8'
      ).toString('base64');

      expect(result.css.toString()).to.equal(
        `.sass {\n  background: url("data:image/svg+xml;base64,${expectedResult}");\n}`
      );
    });

    it('should optimize svg with styling', async function () {
      const result = await sass.compileStringAsync('.sass{background: svg("path.svg", (path: (fill: #fff)))}', {
        functions: {
          'svg($path, $selectors: null)': svg(__dirname, {
            optimize: true
          })
        }
      });
      const expectedResult = Buffer.from(
        '<svg width="400" height="210"><path fill="#FFF" d="M150 0 75 200h150Z"/></svg>',
        'utf8'
      ).toString('base64');

      expect(result.css.toString()).to.equal(
        `.sass {\n  background: url("data:image/svg+xml;base64,${expectedResult}");\n}`
      );
    });
  });
});
