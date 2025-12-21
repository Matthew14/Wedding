import { defineConfig } from 'cypress';
import { resetDatabase, queryDatabase, queryDatabaseMultiple } from './cypress/support/database';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3907',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      // Database tasks for test isolation and verification
      on('task', {
        // Reset database to clean state with test data
        async resetDb() {
          await resetDatabase();
          return null;
        },

        // Query single record from database
        async queryDatabase(params: { table: string; code?: string; id?: string }) {
          return await queryDatabase(params);
        },

        // Query multiple records from database
        async queryDatabaseMultiple(params: { table: string; column?: string; value?: string }) {
          return await queryDatabaseMultiple(params);
        },
      });

      return config;
    },
  },
});
