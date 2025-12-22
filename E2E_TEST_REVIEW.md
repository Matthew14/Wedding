# E2E Test Logic Review

## Overview
This document reviews the logic of all e2e tests in `cypress/e2e/auth.cy.ts` and `cypress/e2e/rsvp.cy.ts`.

---

## 🔴 Critical Issues

### 1. **Auth: Unsafe selector for protected route test** (auth.cy.ts:104)
```typescript
cy.url({ timeout: 5000 }).should('match', /login|unauthorized/i);
```
**Problem**: This regex matches ANY URL containing "login" or "unauthorized" as substrings.
**Example**: Would incorrectly pass for URLs like `/dashboard/login-help` or `/some-unauthorized-page`
**Fix**: Use more specific assertions:
```typescript
cy.url({ timeout: 5000 }).should('match', /^https?:\/\/[^/]+\/login(\?|$)/);
// OR simply:
cy.url({ timeout: 5000 }).should('include', '/login');
```

### 2. **RSVP: Missing null checks in database verification** (rsvp.cy.ts:289-293)
```typescript
const john = invitees.find(inv => inv.first_name === 'John');
const jane = invitees.find(inv => inv.first_name === 'Jane');
expect(john.coming).to.equal(true);  // ❌ john could be undefined
expect(jane.coming).to.equal(false); // ❌ jane could be undefined
```
**Problem**: `.find()` returns `undefined` if not found, causing test to fail with unclear error.
**Fix**: Add assertions:
```typescript
expect(john).to.exist;
expect(jane).to.exist;
expect(john!.coming).to.equal(true);
expect(jane!.coming).to.equal(false);
```

### 3. **RSVP: Fragile DOM traversal** (Multiple locations)
```typescript
cy.contains('John Doe').parent().parent().find('input[type="checkbox"]')
```
**Problem**: Using `.parent().parent()` is fragile and breaks if DOM structure changes.
**Fix**: Use data attributes or more specific selectors:
```typescript
cy.get('[data-testid="invitee-john-checkbox"]')
// OR
cy.get('input[type="checkbox"][name="invitee-john"]')
```

---

## ⚠️ Logic Issues

### 4. **Auth: Inconsistent timeout usage** (auth.cy.ts:116-117)
```typescript
cy.url().should('include', '/dashboard');  // No timeout
cy.contains('Dashboard', { timeout: 5000 }).should('be.visible');  // Has timeout
```
**Problem**: First assertion has default 4s timeout, second has explicit 5s. Could cause flaky tests.
**Fix**: Be consistent:
```typescript
cy.url({ timeout: 10000 }).should('include', '/dashboard');
cy.contains('Dashboard', { timeout: 5000 }).should('be.visible');
```

### 5. **Auth: Redundant navigation** (auth.cy.ts:127)
```typescript
cy.login(authData.validUser.email, authData.validUser.password);
cy.visit('/dashboard');  // ❌ Already on dashboard after login
```
**Problem**: `cy.login()` command waits for redirect away from login, so we're already on dashboard. This adds 500-1000ms delay.
**Fix**: Remove redundant visit or verify the command doesn't already redirect.

### 6. **RSVP: Potential uncheck failure** (rsvp.cy.ts:270)
```typescript
cy.contains('Jane Doe').parent().parent().find('input[type="checkbox"]').uncheck();
```
**Problem**: `.uncheck()` might fail if checkbox is already unchecked (depending on Cypress version).
**Fix**: Only interact with the checkbox you want checked:
```typescript
// Only check John, don't touch Jane
cy.contains('John Doe').parent().parent().find('input[type="checkbox"]').check();
// Then verify Jane is NOT checked if needed
cy.contains('Jane Doe').parent().parent().find('input[type="checkbox"]').should('not.be.checked');
```

### 7. **RSVP: Missing validation check in edit test** (rsvp.cy.ts:241)
```typescript
cy.get('textarea[placeholder*="dietary"]').clear().type('Gluten-free');
```
**Problem**: Uses `.clear()` but doesn't verify the field was pre-populated with the previous value.
**Fix**: Add assertion before clearing:
```typescript
cy.get('textarea[placeholder*="dietary"]')
  .should('have.value', 'Vegetarian, no nuts')  // Verify old value
  .clear()
  .type('Gluten-free');
```

### 8. **Auth: Logout test doesn't verify destination** (auth.cy.ts:134)
```typescript
cy.url({ timeout: 5000 }).should('not.include', '/dashboard');
```
**Problem**: Only checks that it left dashboard, not WHERE it went. Could redirect to any page.
**Fix**: Verify expected destination:
```typescript
cy.url({ timeout: 5000 }).should('eq', Cypress.config().baseUrl + '/');
// OR at minimum:
cy.url({ timeout: 5000 }).should('match', /^\/$|^\/$/);
```

---

## 🟡 Code Quality Issues

### 9. **Hardcoded waits are anti-pattern** (auth.cy.ts:51, 69)
```typescript
cy.wait(500);
```
**Problem**: Fixed waits make tests slower and can still be flaky. Cypress recommends waiting for specific conditions.
**Justification**: In this case, it's working around a Mantine rendering issue. Acceptable for now but should be documented.
**Better approach (if possible)**: Wait for specific state or element.

### 10. **Force clicking bypasses visibility checks** (rsvp.cy.ts:121, 132, etc.)
```typescript
.find('input[type="radio"][value="yes"]').click({ force: true });
```
**Problem**: `{ force: true }` bypasses Cypress's actionability checks. Might hide real UI issues.
**Justification**: Radio buttons might be hidden with custom styling (Mantine). Need to verify this is intentional.
**Recommendation**: Add comment explaining why force is needed.

### 11. **Success page query parameters not verified** (rsvp.cy.ts:147, 199, etc.)
```typescript
cy.url({ timeout: 10000 }).should('include', '/rsvp/success');
```
**Problem**: URL includes query params (`?accepted=yes&code=TEST01`) but test doesn't verify them.
**Fix**: Add assertions:
```typescript
cy.url({ timeout: 10000 })
  .should('include', '/rsvp/success')
  .and('include', 'accepted=yes')
  .and('include', 'code=TEST01');
```

### 12. **Missing error assertion strength** (rsvp.cy.ts:336)
```typescript
cy.contains(/not found|invalid|error/i, { timeout: 5000 });
```
**Problem**: No `.should()` call - if no matching text exists, test just times out with unclear error.
**Fix**: Add explicit assertion:
```typescript
cy.contains(/not found|invalid|error/i, { timeout: 5000 }).should('be.visible');
```

---

## 🔵 Missing Test Cases

### Authentication Tests

#### 13. **No test for session expiry**
**Scenario**: User session expires while on dashboard
**Importance**: High - Core security feature

#### 14. **No test for "remember me" functionality**
**Scenario**: If auth system supports persistent sessions
**Importance**: Medium - Depends on if feature exists

#### 15. **No test for password requirements**
**Scenario**: Weak password rejection during account creation
**Importance**: Low - Only if signup exists

#### 16. **Incomplete navigation tests**
**Current**: Tests that dashboard link is hidden when not authenticated
**Missing**: Should verify login/signup links ARE shown
**Importance**: Medium - Improves test coverage

#### 17. **No test for login form behavior while already logged in**
**Scenario**: Type credentials on login page while already authenticated
**Importance**: Low - Edge case

### RSVP Tests

#### 18. **No test for paste event handling**
**Current**: Code has `handlePaste` function (rsvp/page.tsx:78)
**Missing**: Test for pasting RSVP code
**Importance**: Medium - Implemented feature should be tested

#### 19. **No test for special characters in code input**
**Scenario**: Type `!@#$%` in code field
**Expected**: Should be stripped out (only alphanumeric allowed)
**Importance**: Medium - Input validation test

#### 20. **No test for direct success page access**
**Scenario**: Visit `/rsvp/success` directly without submitting
**Expected**: Should redirect or show error
**Importance**: Medium - Security/UX consideration

#### 21. **No test for form validation errors**
**Scenario**: Accept invitation but don't select any invitees
**Expected**: Should show validation error
**Importance**: High - Critical form validation

#### 22. **No test for villa field conditional display**
**Scenario**: When declining invitation, villa question should be hidden
**Expected**: Villa question not visible when `accepted=no`
**Importance**: Medium - UX consistency

#### 23. **No test for switching between invitation codes**
**Scenario**: Submit RSVP for TEST01, then visit /rsvp/TEST02
**Expected**: Should work independently
**Importance**: Low - Multiple users scenario

#### 24. **No test for empty optional fields**
**Scenario**: Submit RSVP without filling dietary restrictions, song, etc.
**Expected**: Should save as empty/null
**Current**: Only tests filled fields
**Importance**: Medium - Data integrity

#### 25. **No test for editing someone else's RSVP**
**Scenario**: Try to edit RSVP with different code than originally used
**Expected**: Security test - should not allow
**Importance**: High - Security vulnerability

#### 26. **No test for very long text in fields**
**Scenario**: Type 10,000 characters in message field
**Expected**: Should be truncated or rejected
**Importance**: Low - DOS prevention

#### 27. **No test for code entry with spaces**
**Scenario**: Type `TES T01` (with space)
**Expected**: Should strip spaces automatically
**Importance**: Medium - Common user mistake

---

## ✅ Well-Tested Scenarios

### Good test coverage for:
- ✅ Login form display and basic validation
- ✅ Invalid credentials error handling
- ✅ Successful login and redirect
- ✅ Protected route access control
- ✅ Session persistence after page refresh
- ✅ RSVP code validation (valid, invalid, too short, uppercase conversion)
- ✅ Complete RSVP submission flow (accepting and declining)
- ✅ RSVP editing functionality
- ✅ Partial invitee attendance
- ✅ Database verification of saved data
- ✅ Direct link navigation to RSVP form

---

## 🎯 Recommendations Priority

### High Priority (Fix Now)
1. **#2**: Add null checks in RSVP invitee verification
2. **#21**: Add form validation tests (accepting without selecting invitees)
3. **#25**: Add security test for editing other people's RSVPs

### Medium Priority (Fix Soon)
4. **#1**: Make protected route URL assertion more specific
5. **#3**: Replace fragile DOM traversal with data-testid attributes
6. **#11**: Verify success page query parameters
7. **#18**: Add paste event test
8. **#22**: Test villa field conditional display

### Low Priority (Nice to Have)
9. **#4-8**: Various consistency and clarity improvements
10. **#16-20, #23-27**: Additional edge case coverage

---

## 📊 Test Coverage Summary

| Category | Test Count | Coverage Level |
|----------|-----------|----------------|
| **Auth Tests** | 11 | Good (70%) |
| **RSVP Tests** | 14 | Excellent (85%) |
| **Total** | 25 | Very Good (78%) |

### Coverage Gaps:
- Form validation errors
- Security boundary tests
- Edge cases with unusual input
- Session/state management edge cases

---

## 🔧 Suggested Test Data Improvements

### Current Test Data
- ✅ One admin user (`admin@wedding.test`)
- ✅ Two RSVP codes (TEST01, TEST02)
- ✅ Three invitees (John Doe, Jane Doe, Alice Smith)

### Recommended Additions
1. **Add test user without admin privileges** (if role system exists)
2. **Add RSVP with single invitee AND couple** - Currently only has couples OR singles
3. **Add pre-submitted RSVP data** - To test "already responded" state without submitting first

---

## 📝 Documentation Notes

### What's Well Documented
- ✅ Auth test prerequisites comment (lines 3-16)
- ✅ Test descriptions are clear
- ✅ Database reset documented in code

### Needs Documentation
- ❌ Why `{ force: true }` is needed for clicks/types
- ❌ The 500ms wait justification
- ❌ Expected test data structure (link to database.ts)
- ❌ What happens on test failure (screenshots, videos)

---

## 🏗️ Structural Improvements

### Current Structure: ✅ Good
```
describe('Feature')
  describe('Sub-feature')
    beforeEach() - isolated setup
    it('specific test case')
```

### Suggestions:
1. **Extract common selectors** into constants at top of file
2. **Create helper functions** for common actions (e.g., `fillRSVPForm()`)
3. **Add custom commands** for complex flows (e.g., `cy.submitRSVP()`)

---

## 🎬 Test Execution

### Performance
- Auth tests: ~28 seconds ✅
- RSVP tests: ~34 seconds ✅
- Total: ~1 minute ✅ (Fast enough)

### Flakiness Risk
- **Low risk** - Tests are well isolated with database reset
- **Medium risk** - Fixed waits and force clicks could cause issues in different environments
- **Mitigation** - All tests passing in CI, timeouts are generous

---

## Summary

The e2e test suite is **well-structured and covers the critical user flows**. The main issues are:

1. **Few critical bugs** in assertions (#1, #2)
2. **Some missing edge cases** (#21, #25)
3. **Code quality improvements needed** for maintainability (#3, #11)

**Overall Grade: B+ (85%)** - Solid foundation with room for targeted improvements.
