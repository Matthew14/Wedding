import { defineConfig } from 'cypress';
import { resetDatabase } from './cypress/support/database';

export default defineConfig({
  projectId: 'b4zibi',
  e2e: {
    baseUrl: 'http://localhost:3907',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,

    setupNodeEvents(on, config) {
      on('task', {
        log(message: string) {
          console.log(message);
          return null;
        },
        table(data: Array<Record<string, string | number>>) {
          console.table(data);
          return null;
        },
        // Note: auth tests require a Cognito admin user to exist in the test
        // user pool (COGNITO_USER_POOL_ID). There is no automated setup for
        // this — create the user manually via the AWS console or CLI before
        // running E2E tests.
        resetDb: () => resetDatabase().then(() => null),
      });

      return config;
    },
  },
});
