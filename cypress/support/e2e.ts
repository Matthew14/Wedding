// Import commands.js using ES2015 syntax:
import './commands';
import 'cypress-axe';
import 'cypress-plugin-tab';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Ignore React hydration errors from Mantine's ColorSchemeScript
// This is a known issue with Mantine where the server/client renders differ slightly
Cypress.on('uncaught:exception', (err) => {
    // Ignore React hydration mismatch errors (Mantine ColorSchemeScript causes these).
    // Covers both dev error messages and minified production error codes.
    if (err.message.includes('Hydration failed') ||
        err.message.includes('hydration mismatch') ||
        err.message.includes('server rendered HTML') ||
        /Minified React error #4(1[0-9]|2[0-9])/.test(err.message)) {
        return false;
    }
    return true;
});
