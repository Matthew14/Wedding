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
      // Force light mode in Electron browser
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' || browser.name === 'electron') {
          launchOptions.args.push('--force-color-profile=srgb');
          launchOptions.args.push('--force-prefers-color-scheme=light');
          launchOptions.preferences = launchOptions.preferences || {};
          launchOptions.preferences.default_content_settings = {
            media_stream: 1,
          };
        }
        return launchOptions;
      });
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

        // Logging tasks for accessibility test results
        log(message: string) {
          console.log(message);
          return null;
        },

        table(data: Array<Record<string, string | number>>) {
          console.table(data);
          return null;
        },
      });

      return config;
    },
  },
});
