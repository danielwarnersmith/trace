import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import oxlint from 'eslint-plugin-oxlint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  ...oxlint.configs['flat/recommended'],
];
