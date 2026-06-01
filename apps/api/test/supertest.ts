/** CJS-compatible supertest for Jest e2e (avoids default import issues). */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const supertest = require('supertest') as typeof import('supertest');
export default supertest;
