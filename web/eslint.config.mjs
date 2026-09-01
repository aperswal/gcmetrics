import { dirname } from 'path';
import { fileURLToPath } from 'url';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NO_NON_ASCII_SELECTORS = [
  {
    selector: 'Literal[value=/[^\\x00-\\x7F]/]',
    message: 'Non-ASCII in string literal. Use ASCII (em-dash -> -, smart quote -> \' or ").',
  },
  {
    selector: 'TemplateElement[value.raw=/[^\\x00-\\x7F]/]',
    message: 'Non-ASCII in template literal.',
  },
];

const NO_PROCESS_ENV = {
  selector: 'MemberExpression[object.object.name="process"][object.property.name="env"]',
  message: 'This app reads no environment variables. Add a validated lib/env.ts before using one.',
};

const NO_PLAIN_ERROR = {
  selector: "NewExpression[callee.name='Error']",
  message: 'Use the typed errors in @/lib/errors instead of plain Error.',
};

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'coverage/**',
      '.stryker-tmp/**',
      'reports/**',
      'next-env.d.ts',
      'eslint.config.mjs',
      'postcss.config.mjs',
      'next.config.ts',
      'vitest.config.mts',
      'stryker.config.mjs',
    ],
  },
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { sonarjs },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        {
          selector: 'property',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
        { selector: 'property', modifiers: ['requiresQuotes'], format: null },
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'import', format: null },
      ],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      complexity: ['error', { max: 7 }],
      'sonarjs/cognitive-complexity': ['error', 10],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/no-redundant-jump': 'error',
      'sonarjs/no-duplicated-branches': 'error',
      'sonarjs/no-identical-conditions': 'error',
      'sonarjs/no-gratuitous-expressions': 'error',
      'sonarjs/no-useless-catch': 'error',
      'max-depth': ['error', { max: 4 }],
      'max-params': ['error', { max: 4 }],
      'max-nested-callbacks': ['error', { max: 3 }],
      'default-case': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      '@typescript-eslint/strict-boolean-expressions': [
        'error',
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: true,
          allowNullableBoolean: true,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      'no-implicit-coercion': 'error',
      'no-param-reassign': 'error',
      '@typescript-eslint/no-shadow': 'error',
      'guard-for-in': 'error',
      'no-magic-numbers': [
        'error',
        {
          ignore: [0, 1, -1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      'consistent-return': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
          minimumDescriptionLength: 10,
        },
      ],
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-console': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-nested-ternary': 'error',
      'prefer-template': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-unneeded-ternary': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': ['error', { allowNamedFunctions: false }],
      'no-lonely-if': 'error',
      'no-useless-return': 'error',
      curly: ['error', 'all'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': ['error', ...NO_NON_ASCII_SELECTORS, NO_PROCESS_ENV, NO_PLAIN_ERROR],
    },
  },
  {
    files: ['**/*.tsx'],
    ignores: ['**/*.test.tsx'],
    rules: {
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/html-has-lang': 'error',
      'jsx-a11y/no-redundant-roles': 'error',
      'jsx-a11y/scope': 'error',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'max-nested-callbacks': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-magic-numbers': 'off',
      'no-restricted-syntax': ['error', NO_PROCESS_ENV],
    },
  },
  {
    files: ['components/ui/**'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-magic-numbers': 'off',
    },
  },
  {
    files: ['scripts/**'],
    rules: {
      'no-console': 'off',
      'no-magic-numbers': 'off',
      'no-restricted-syntax': ['error', ...NO_NON_ASCII_SELECTORS],
    },
  },
);
