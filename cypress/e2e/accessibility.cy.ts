/// <reference types="cypress" />

import type * as axe from 'axe-core';

describe('Accessibility Tests', () => {
  const axeConfig = {
    runOnly: {
      type: 'tag' as const,
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
    rules: {
      'color-contrast': { enabled: false },
    },
  };

  const logViolations = (violations: axe.Result[]) => {
    cy.task(
      'log',
      `${violations.length} accessibility violation${violations.length === 1 ? '' : 's'} detected`
    );
    const violationData = violations.map(({ id, impact, description, nodes, helpUrl }) => ({
      id,
      impact: impact || 'unknown',
      description,
      nodes: nodes.length,
      helpUrl,
    }));
    cy.task('table', violationData);
  };

  beforeEach(() => {
    cy.resetDb();
  });

  it('Homepage should have no accessibility violations', () => {
    cy.visit('/');
    cy.injectAxe();
    cy.checkA11y(undefined, axeConfig, logViolations);
  });

  it('Login page should have no accessibility violations', () => {
    cy.visit('/login');
    cy.injectAxe();
    cy.checkA11y(undefined, axeConfig, logViolations);
  });

  it('404 page should have no accessibility violations', () => {
    cy.visit('/nonexistent-page', { failOnStatusCode: false });
    cy.injectAxe();
    cy.checkA11y(undefined, axeConfig, logViolations);
  });
});
