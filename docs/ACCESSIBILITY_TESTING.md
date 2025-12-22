# Accessibility Testing

This document describes the accessibility testing setup for the wedding website, ensuring the site is usable by everyone, including people with disabilities.

## Overview

We use automated accessibility testing with **cypress-axe** and **axe-core** to catch WCAG 2.1 Level AA compliance issues during development and in our CI/CD pipeline.

## Testing Standards

Our accessibility tests verify compliance with:
- **WCAG 2.0 Level A & AA** - Web Content Accessibility Guidelines
- **WCAG 2.1 Level A & AA** - Updated guidelines with mobile and low vision improvements
- **Section 508** - U.S. federal accessibility requirements (covered by WCAG 2.0 AA)

## Running Tests

### Run All Accessibility Tests
```bash
npm run test:a11y
```
This command:
1. Starts the Supabase test database
2. Starts the Next.js development server on port 3907
3. Runs all accessibility tests in `cypress/e2e/accessibility.cy.ts`
4. Stops the server when complete

### Run Specific Accessibility Tests (Interactive)
```bash
npm run cypress:open
```
Then select `accessibility.cy.ts` from the test list.

### Run in CI/CD
The accessibility tests run automatically as part of the E2E test suite in GitHub Actions:
```bash
npm run test:e2e
```

## Test Coverage

### Public Pages
- ✅ Homepage
- ✅ Location page
- ✅ Schedule page
- ✅ FAQs page
- ✅ 404 page

### RSVP Flow
- ✅ RSVP code entry page
- ✅ RSVP form page
- ✅ RSVP form with confirmation modal open
- ✅ RSVP success page (accepted)
- ✅ RSVP success page (declined)

### Navigation
- ✅ Keyboard navigation through site
- ✅ Skip to main content link
- ✅ Focus indicators on interactive elements

### Component-Specific
- ✅ Form inputs with labels and ARIA attributes
- ✅ Radio buttons with proper ARIA
- ✅ Checkboxes with proper ARIA
- ✅ Color contrast (WCAG AA minimum 4.5:1 for normal text)

## What axe-core Tests For

axe-core automatically checks for over 90 accessibility rules including:

### Critical Issues
- Missing alt text on images
- Missing form labels
- Insufficient color contrast
- Missing page titles
- Broken ARIA attributes

### Best Practices
- Proper heading hierarchy
- Landmark regions
- Keyboard accessibility
- Focus management
- Screen reader compatibility

## Understanding Test Results

### When Tests Pass ✅
No accessibility violations were detected. The page meets WCAG 2.1 Level AA standards.

### When Tests Fail ❌
The test will output:
1. **Number of violations** - How many issues were found
2. **Violation details** - A table showing:
   - `id` - The rule that failed (e.g., "color-contrast")
   - `impact` - Severity (critical, serious, moderate, minor)
   - `description` - What the issue is
   - `nodes` - How many elements are affected
   - `helpUrl` - Link to detailed fix instructions

Example output:
```
3 accessibility violations detected

┌─────────────────────┬──────────┬────────────────────────────────┬───────┐
│ id                  │ impact   │ description                    │ nodes │
├─────────────────────┼──────────┼────────────────────────────────┼───────┤
│ color-contrast      │ serious  │ Elements must have sufficient… │ 2     │
│ label               │ critical │ Form elements must have labels │ 1     │
└─────────────────────┴──────────┴────────────────────────────────┴───────┘
```

## Fixing Common Issues

### Color Contrast
**Issue**: Text doesn't have sufficient contrast against its background.

**Fix**: Ensure contrast ratio is at least:
- 4.5:1 for normal text
- 3:1 for large text (18pt+ or 14pt+ bold)

Use a contrast checker: https://webaim.org/resources/contrastchecker/

### Missing Form Labels
**Issue**: Input elements don't have associated labels.

**Fix**:
```tsx
// Bad
<input type="text" />

// Good
<label htmlFor="name">Name</label>
<input id="name" type="text" />

// Or with aria-label
<input type="text" aria-label="Name" />
```

### Missing Alt Text
**Issue**: Images don't have alt attributes.

**Fix**:
```tsx
// Bad
<img src="/photo.jpg" />

// Good
<img src="/photo.jpg" alt="Rebecca and Matthew at their engagement" />

// Decorative images (use empty alt)
<img src="/decoration.svg" alt="" />
```

### Heading Hierarchy
**Issue**: Headings skip levels (e.g., h1 → h3).

**Fix**: Use headings in order (h1, h2, h3...) without skipping levels.

## Adding New Tests

To test a new page or component:

1. Open `cypress/e2e/accessibility.cy.ts`
2. Add a new test case:

```typescript
it('New page should have no accessibility violations', () => {
  cy.visit('/new-page');
  cy.injectAxe();
  cy.checkA11y(null, axeConfig, logViolations);
});
```

3. Run the tests to verify:
```bash
npm run test:a11y
```

## CI/CD Integration

Accessibility tests run automatically on:
- Every pull request
- Pushes to `main` and `develop` branches

The CI workflow is defined in `.github/workflows/ci.yml` under the `e2e` job.

## Manual Testing

Automated tests catch ~57% of accessibility issues. Manual testing is still important:

### Keyboard Navigation
- [ ] Can you tab through all interactive elements?
- [ ] Is the focus indicator visible?
- [ ] Can you activate buttons with Enter/Space?
- [ ] Can you close modals with Escape?

### Screen Reader Testing
- [ ] Test with NVDA (Windows) or VoiceOver (Mac)
- [ ] Are all interactive elements announced?
- [ ] Is the page structure clear?
- [ ] Are error messages read aloud?

### Zoom Testing
- [ ] Test at 200% zoom - is content still usable?
- [ ] Does horizontal scrolling appear?
- [ ] Are all interactive elements still accessible?

## Resources

- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) - Full list of rules
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Official guidelines
- [WebAIM](https://webaim.org/) - Accessibility resources and tools
- [A11y Project](https://www.a11yproject.com/) - Accessibility best practices
- [Deque University](https://dequeuniversity.com/) - Detailed fix guides

## Exceptions and Known Issues

If you need to disable a specific rule (use sparingly):

```typescript
cy.checkA11y(null, {
  rules: {
    'color-contrast': { enabled: false }, // Only if you have a valid reason
  },
});
```

Document any exceptions here with justification.

## Maintenance

- **Review test coverage** when adding new pages/components
- **Update this document** when changing testing strategy
- **Monitor axe-core updates** for new rules and improvements
- **Address violations promptly** - don't let them accumulate

---

**Remember**: Accessibility is not just about compliance—it's about making our wedding website usable and enjoyable for all our guests, regardless of their abilities.
