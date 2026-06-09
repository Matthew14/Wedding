import { defineConfig } from 'cypress';

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
      });

      return config;
    },
  },
});
