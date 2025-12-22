/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        /**
         * Injects axe-core into the page for accessibility testing
         */
        injectAxe(): Chainable<void>;

        /**
         * Runs axe accessibility tests on the page
         * @param context - Optional selector or context to limit testing scope
         * @param options - Optional axe configuration options
         * @param violationCallback - Optional callback to handle violations
         */
        checkA11y(
            context?: string | Node | axe.ContextObject,
            options?: axe.RunOptions,
            violationCallback?: (violations: axe.Result[]) => void
        ): Chainable<void>;
    }
}
