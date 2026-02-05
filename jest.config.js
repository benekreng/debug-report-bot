export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    'langchain/**/*.js',
    '!**/__tests__/**',
  ],
  watchman: false,
};
