// Import commands.js using ES2015 syntax:
import './commands';
import 'cypress-axe';
import 'cypress-plugin-tab';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Ignore React hydration errors from Mantine's ColorSchemeScript
// This is a known issue with Mantine where the server/client renders differ slightly
Cypress.on('uncaught:exception', (err) => {
    // Ignore hydration mismatch errors
    if (err.message.includes('Hydration failed') ||
        err.message.includes('hydration mismatch') ||
        err.message.includes('server rendered HTML')) {
        return false;
    }
    // Let other errors fail the test
    return true;
});
