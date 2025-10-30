// @ts-check
import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      'dist/',
      'build/',
      '.next/',
      'out/',
      '.vercel/',
      '.turbo/',
      'node_modules/',
      '.eslintcache',
      'coverage/',
      '.nyc_output/',
      '.vite/',
      '.parcel-cache/',
      'storybook-static/',
      '**/*.min.js',
      'webfonts/',
    ],
  },
  js.configs.recommended,
  {
    plugins: { import: pluginImport },
    rules: {
      'no-unused-vars': ['warn', {
        args: 'after-used',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      'no-undef': 'error',
      'import/no-unresolved': 'off',
    },
  },
  prettier,
  {
    files: ['api/**/*.js'],
    languageOptions: {
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        require: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    files: ['js/**/*.js', 'color-palette/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        performance: 'readonly',
        URL: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        Image: 'readonly',
        Blob: 'readonly',
        Node: 'readonly',
        XMLSerializer: 'readonly',
        DOMParser: 'readonly',
        $: 'readonly',
        jQuery: 'readonly',
        HTMLLinkElement: 'readonly',
        tinycolor: 'readonly',
        domtoimage: 'readonly',
        ColorPalette: 'readonly',
        applyFilter: 'readonly',
        processOutput: 'readonly',
        copyToClipboard: 'readonly',
        define: 'readonly',
        module: 'readonly',
        CHANGELOG_ENTRIES: 'readonly',
        fetch: 'readonly',
        Storage: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': ['warn', {
        args: 'after-used',
        ignoreRestSiblings: true,
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
    },
  },
  {
    files: ['js/chatlog-parser.js'],
    rules: { 'no-useless-escape': 'off' },
  },
];

