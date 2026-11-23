import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_EXTRA_LATIN_SPACING_PT,exactLatinLineHeightPt,extraLatinSpacingPt} from './latin-spacing.js';

test('3 pt de separación adicional son un valor natural y legible en Word y HTML',()=>{
  const exact=exactLatinLineHeightPt(10.5,DEFAULT_EXTRA_LATIN_SPACING_PT);
  assert.equal(exact,15.6);
  assert.equal(extraLatinSpacingPt(10.5,exact),3);
});
test('cuadernos anteriores conservan altura exacta y pueden ajustarse desde el nuevo control',()=>{
  assert.equal(extraLatinSpacingPt(10.5,20),7.4);
  assert.equal(extraLatinSpacingPt(10.5,30),17.4);
  assert.equal(exactLatinLineHeightPt(12,3),17.4);
});
