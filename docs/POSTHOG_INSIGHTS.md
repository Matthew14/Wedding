# PostHog Analytics Insights

This document explains what insights you'll get from the PostHog analytics implementation in your wedding website.

## What's Being Tracked

### RSVP Code Entry Page (`/rsvp`)

| Event | What it tracks | Insights you get |
|-------|---------------|------------------|
| `rsvp_code_entry_viewed` | Page load | How many people visit the RSVP page |
| `rsvp_code_entered` | User enters 6-character code | Drop-off rate at code entry |
| `rsvp_code_validated` | Code successfully validated | Success rate of code validation |
| `rsvp_code_invalid` | Invalid code entered | Common errors, typos |

### RSVP Form Page (`/rsvp/[code]`)

| Event | What it tracks | Insights you get |
|-------|---------------|------------------|
| `rsvp_form_viewed` | Form page loads | How many get to the form |
| `rsvp_form_started` | User interacts with form | How many actually start filling it out |
| `rsvp_acceptance_changed` | Yes/No toggle | Do people change their mind? |
| `rsvp_invitee_selected` | Guest checked | Which guests are coming |
| `rsvp_invitee_deselected` | Guest unchecked | Partial attendance patterns |
| `rsvp_villa_selected` | Villa yes/no | Accommodation preferences |
| `rsvp_dietary_filled` | Dietary restrictions added | How many have dietary needs |
| `rsvp_song_requested` | Song request added | Feature usage |
| `rsvp_travel_plans_filled` | Travel plans added | Feature usage |
| `rsvp_message_filled` | Message added | Feature usage |
| `rsvp_submit_attempted` | Submit button clicked | Submit attempts vs success |
| `rsvp_submit_confirmed` | Modal confirmed | Confirmation rate |
| `rsvp_submit_success` | Submission successful | Final RSVP completion |
| `rsvp_submit_failed` | Submission failed | Error rate and reasons |

## Funnel Analysis You Can Build

### Basic RSVP Funnel
```
Code Entry Page Viewed    → 100 users
Code Entered              → 85 users  (15% drop - lost invitation?)
Code Validated            → 80 users  (6% drop - wrong code?)
Form Viewed               → 78 users  (2% drop - navigation issue?)
Form Started              → 70 users  (10% drop - confusing UI?)
Submit Attempted          → 65 users  (7% drop - gave up?)
Submit Confirmed          → 60 users  (8% drop - second thoughts?)
Submit Success            → 58 users  (3% drop - errors?)
```

**What this tells you:**
- Where people are dropping off
- Which step needs improvement
- Success rate at each stage

### Acceptance Funnel
```
Form Viewed              → 100 users
Selected "Yes"           → 70 users  (70% acceptance rate)
Selected "No"            → 30 users  (30% decline rate)
```

**Segmented by:**
- Time (early RSVPs vs late)
- Code type (if you have different invitation types)
- Device (mobile vs desktop)

## Questions You Can Answer

### Engagement Questions
- **"How many people are filling out optional fields?"**
  - Count `rsvp_dietary_filled` / total submissions
  - Count `rsvp_song_requested` / total submissions
  - Shows which features guests care about

- **"Are people using the edit RSVP feature?"**
  - Count `rsvp_edit_viewed` events
  - Time between original submission and edit
  - What fields they're changing

- **"Do people change their mind before submitting?"**
  - Count `rsvp_acceptance_changed` events
  - Track from/to values (yes→no, no→yes)
  - Time spent before changing

### UX Questions
- **"Where are people getting stuck?"**
  - Compare event counts at each step
  - Look for large drop-offs
  - Example: If many `form_started` but few `submit_attempted`, form might be confusing

- **"How long does RSVP take?"**
  - Time between `form_viewed` and `submit_success`
  - Average: Should be 2-3 minutes
  - If >5 minutes, form might be too complex

- **"Are mobile users having trouble?"**
  - Filter funnel by device type
  - Mobile vs desktop completion rates
  - Specific steps where mobile users drop off more

### Conversion Questions
- **"What's the overall RSVP completion rate?"**
  ```
  (submit_success / code_entry_viewed) * 100 = X%
  ```

- **"How many people abandon at the confirmation modal?"**
  ```
  submit_attempted - submit_confirmed = abandoned
  ```
  - If high, modal might be scary/confusing

- **"What percentage decline vs accept?"**
  ```
  Count acceptance_changed where value = "no"
  ```

## PostHog Dashboards to Create

### 1. RSVP Overview Dashboard
- Total RSVPs submitted (today, this week, all time)
- Acceptance rate (yes vs no)
- Completion rate (started vs finished)
- Average time to complete

### 2. Funnel Dashboard
- Visual funnel showing all steps
- Drop-off percentages
- Conversion rate
- Compare mobile vs desktop

### 3. Feature Usage Dashboard
- % using dietary restrictions
- % requesting songs
- % adding travel plans
- % adding messages

### 4. Error Tracking Dashboard
- Invalid code attempts
- Submission failures
- Error messages seen

### 5. Time-based Dashboard
- RSVPs per day
- Peak times (hour of day, day of week)
- Time to complete trend
- Early vs late responder patterns

## Example Insights You'll Discover

### Real-World Scenario 1
**Discovery:** 40% of users drop off at code entry
**Data shows:** Many `code_invalid` events with similar patterns
**Insight:** People are adding dashes or spaces ("ABC-123" instead of "ABC123")
**Action:** Auto-strip special characters in real-time, not just on submit

### Real-World Scenario 2
**Discovery:** Mobile users take 4x longer to complete
**Data shows:** Time between events is much longer on mobile
**Insight:** Mobile keyboard makes typing slower, form seems overwhelming on small screen
**Action:** Consider progressive disclosure or cleaner mobile layout

### Real-World Scenario 3
**Discovery:** 25% of acceptances become declines before submission
**Data shows:** `acceptance_changed` from yes→no, average 2 minutes after initial "yes"
**Insight:** People are reading through the whole form (dietary, travel) and realizing it's too much effort
**Action:** Simplify optional fields or break into multi-step form

### Real-World Scenario 4
**Discovery:** Only 10% fill out song requests
**Data shows:** Low `song_requested` count
**Insight:** Either people don't care, or field placement is bad
**Action:** Could remove feature to simplify form, or make it more prominent

### Real-World Scenario 5
**Discovery:** Spike in RSVPs on Sunday evenings
**Data shows:** `code_entry_viewed` events clustered Sun 7-9pm
**Insight:** People open physical invitations over the weekend, RSVP Sunday night
**Action:** Send reminder emails Sunday afternoons

## How to View This Data

1. **Log into PostHog** (https://app.posthog.com)
2. **Go to "Insights"** → **"New Insight"**
3. **Choose "Funnel"**
4. **Add steps:**
   - Step 1: `rsvp_code_entry_viewed`
   - Step 2: `rsvp_code_validated`
   - Step 3: `rsvp_form_viewed`
   - Step 4: `rsvp_submit_success`

5. **Filter by**:
   - Date range
   - Device type
   - Browser
   - Any custom properties

6. **Save to dashboard**

## Privacy Considerations

- **No personal data tracked**: We don't track names, emails, or RSVP codes in analytics
- **Input masking enabled**: Form inputs are masked in session recordings
- **GDPR compliant**: PostHog is GDPR compliant
- **Can be disabled**: Set `NEXT_PUBLIC_POSTHOG_KEY` to empty string to disable

## Free Tier Limits

PostHog free tier includes:
- **1,000,000 events/month** (way more than you need)
- **Unlimited users**
- **Unlimited dashboards**
- **90 days data retention**
- **Session recordings** (optional)

For a wedding with ~100-200 guests:
- Estimated events: ~5,000-10,000 total
- Well within free tier!

## Next Steps

1. **Sign up for PostHog**: https://posthog.com
2. **Get your project key**
3. **Add to `.env.local`**:
   ```
   NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
   ```
4. **Deploy to production**
5. **Create your first funnel** (see "How to View This Data" above)
6. **Set up alerts** for low completion rates or high errors

---

**Last Updated**: December 2025

For questions about analytics implementation, see the code in:
- `src/components/PostHogProvider.tsx`
- `src/hooks/useTracking.ts`
- `src/app/rsvp/page.tsx` (code entry tracking)
- `src/app/rsvp/[code]/page.tsx` (form tracking)
