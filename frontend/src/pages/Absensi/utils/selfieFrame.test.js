import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selfieFrame } from './selfieFrame.js';

test('portrait phone captures the center strip actually visible in the landscape camera frame', () => {
  const result = selfieFrame(1080, 1920, 320, 180);
  assert.equal(result.x, 0);
  assert.equal(result.cropWidth, 1080);
  assert.equal(result.cropHeight, 607.5);
  assert.equal(result.y, 656.25);
  assert.equal(result.width, 1080);
  assert.equal(result.height, 608);
});

test('4:3 camera is cropped vertically without stretching or upscaling', () => {
  assert.deepEqual(selfieFrame(640, 480, 320, 180), {
    x: 0, y: 60, cropWidth: 640, cropHeight: 360, width: 640, height: 360,
  });
});

test('wide video is cropped horizontally to the actual frame', () => {
  const result = selfieFrame(1920, 1080, 300, 400);
  assert.equal(result.x, 555);
  assert.equal(result.y, 0);
  assert.equal(result.cropWidth, 810);
  assert.equal(result.cropHeight, 1080);
});

test('portrait 3:4 selfie preserves the visible area on a portrait phone camera', () => {
  assert.deepEqual(selfieFrame(1080, 1920, 270, 360), {
    x: 0, y: 240, cropWidth: 1080, cropHeight: 1440, width: 960, height: 1280,
  });
});

test('high resolution captures keep their composition with longest side limited to 1280', () => {
  const result = selfieFrame(3840, 2160, 320, 180);
  assert.equal(result.x, 0);
  assert.equal(result.y, 0);
  assert.equal(result.width, 1280);
  assert.equal(result.height, 720);
});

test('camera not ready or hidden cannot produce a stretched fallback photo', () => {
  assert.equal(selfieFrame(0, 0, 320, 180), null);
  assert.equal(selfieFrame(640, 480, 0, 0), null);
});
