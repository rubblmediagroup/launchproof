import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['node_modules/**', '.next/**', 'dist/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.mjs', '**/*.cjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['apps/desktop/src/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
