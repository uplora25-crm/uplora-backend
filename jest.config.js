/**
 * Jest Configuration
 * 
 * This file configures Jest (our testing framework) to work with TypeScript.
 * It tells Jest to use ts-jest to transpile TypeScript files before running tests.
 */

module.exports = {
  // Use ts-jest preset to handle TypeScript files
  preset: 'ts-jest',
  
  // Test environment (Node.js for backend testing)
  testEnvironment: 'node',
  
  // Where to find test files
  testMatch: ['**/tests/**/*.test.ts'],
  
  // Files to run before each test
  setupFilesAfterEnv: [],
  
  // Module file extensions to recognize
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform TypeScript files using ts-jest
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Coverage settings (optional - for code coverage reports)
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};

