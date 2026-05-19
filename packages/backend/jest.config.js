"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    rootDir: '.',
    testMatch: ['<rootDir>/test/**/*.spec.ts'],
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                tsconfig: '<rootDir>/tsconfig.test.json',
            },
        ],
    },
    moduleNameMapper: {
        '^@domain/(.*)$': '<rootDir>/src/domain/$1',
        '^@application/(.*)$': '<rootDir>/src/application/$1',
        '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
        '^@presentation/(.*)$': '<rootDir>/src/presentation/$1',
        '^@config/(.*)$': '<rootDir>/src/config/$1',
        '^@common/(.*)$': '<rootDir>/src/common/$1',
        '^@event-bus/(.*)$': '<rootDir>/src/event-bus/$1',
    },
    moduleFileExtensions: ['ts', 'js', 'json'],
    testEnvironment: 'node',
    clearMocks: true,
    collectCoverageFrom: [
        'src/domain/**/*.entity.ts',
        'src/domain/**/*.vo.ts',
        'src/domain/errors/*.ts',
    ],
    coverageDirectory: './coverage',
    coverageReporters: ['text', 'lcov', 'clover'],
    verbose: true,
};
exports.default = config;
//# sourceMappingURL=jest.config.js.map