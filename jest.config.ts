import type { Config } from 'jest';

const moduleNameMapper = {
  '^src/(.*)$': '<rootDir>/src/$1',
  '^_types$': '<rootDir>/src/types/types.d.ts',
  '\\.(css|less)$': 'identity-obj-proxy',
  '\\.(gif|icns|jpe?g|png|svg|webp)$': '<rootDir>/src/test-utils/file-mock.ts'
};

const transform = {
  '^.+\\.(ts|tsx)$': [
    'ts-jest',
    {
      tsconfig: '<rootDir>/tsconfig.spec.json'
    }
  ]
};

const config: Config = {
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/{config,tools,window}/**/*.test.ts'],
      moduleNameMapper,
      transform
    },
    {
      displayName: 'renderer',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/ui/**/*.test.(ts|tsx)'],
      moduleNameMapper,
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      transform
    }
  ]
};

export default config;
