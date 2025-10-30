/// <reference types="vitest" />

/** @type {import('vitest').UserConfig} */
export default {
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
};

