export default {
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  mutate: [
    'lib/**/*.ts',
    'components/**/*.tsx',
    'app/**/*.tsx',
    '!**/*.test.{ts,tsx}',
    '!**/*.test-helper.ts',
    '!components/ui/**',
    '!lib/utils.ts',
  ],
  reporters: ['clear-text', 'progress'],
  thresholds: { high: 100, low: 100, break: 100 },
  tempDirName: '.stryker-tmp',
};
