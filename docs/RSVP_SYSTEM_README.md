# RSVP System Implementation

## Overview

The RSVP system allows wedding guests to respond to invitations using unique 6-character codes. The system includes a public entry page, form submission, and success confirmation.

## Features Implemented

### ✅ **Public RSVP Entry Page** (`/rsvp`)

- Clean, user-friendly interface
- 6-character code validation
- Error handling and user feedback
- Responsive design matching wedding theme

### ✅ **RSVP Form Page** (`/rsvp/[code]`)

- Dynamic form based on invitation data
- All required fields from specifications:
    - Are you joining us? (checkbox, required)
    - Individual invitee attendance (dynamic checkboxes)
    - Villa accommodation preference (checkbox, required)
    - Dietary restrictions (multiline text, optional)
    - Song requests (text, optional)
    - Travel plans (multiline text, optional)
    - Additional message (multiline text, optional)

### ✅ **API Endpoints**

- `GET /api/rsvp/validate/[code]` - Validate RSVP codes
- `GET /api/rsvp/[code]` - Fetch RSVP data and invitees
- `POST /api/rsvp/[code]` - Submit RSVP form data

### ✅ **Success Page** (`/rsvp/success`)

- Confirmation message
- Navigation back to main site
- Option to submit another RSVP

### ✅ **Navigation Integration**

- RSVP link added to main navigation
- Accessible from all pages

## Usage Flow

### **Guest Experience**

```
Guest visits /rsvp
    ↓
Enters 6-character code
    ↓
Code validation
    ↓
Redirected to /rsvp/[code]
    ↓
Fills out RSVP form
    ↓
Submits form
    ↓
Sees success page
```

## Technical Implementation

### **Frontend Components**

- `src/app/rsvp/page.tsx` - Main RSVP entry page
- `src/app/rsvp/[code]/page.tsx` - RSVP form page
- `src/app/rsvp/success/page.tsx` - Success confirmation page

### **API Routes**

- `src/app/api/rsvp/validate/[code]/route.ts` - Code validation
- `src/app/api/rsvp/[code]/route.ts` - RSVP data handling

### **Navigation**

- `src/components/Navigation.tsx` - Updated with RSVP link

## Form Validation

### **Required Fields**

- Coming/not coming (yes/no radio selection)
- Villa accommodation preference (only required when accepting)
- At least one guest selected (when accepting invitation)

### **Optional Fields**

- Dietary restrictions (multiline text, max 500 characters)
- Song requests (text, max 200 characters)
- Travel plans (multiline text, max 500 characters)
- Additional messages (multiline text, max 1000 characters)

### **Dynamic Fields**

- Individual invitee attendance (only shown when "coming" is checked)
- Villa accommodation (hidden when declining invitation)

### **Validation Rules**

- When accepting invitation: At least one guest must be selected
- When declining invitation: Guest selection and villa fields are hidden
- All text fields have maximum length constraints
- RSVP codes must be exactly 6 alphanumeric characters
- Codes are automatically converted to uppercase

## Security Features

- Input sanitization for all user inputs
- Code format validation (6-character alphanumeric)
- Client-side form validation with error messages
- Cross-field validation (e.g., guest selection when accepting)
- Database constraint enforcement
- Maximum length constraints on text fields
- Error handling without information leakage

## Styling

The RSVP system uses the existing wedding theme:

- Primary color: `#8b7355` (wedding brown)
- Typography: Serif fonts for headers
- Consistent with existing page designs
- Responsive layout for all devices

## Future Enhancements

### **Potential Additions**

- Email notifications for RSVP submissions
- RSVP deadline enforcement
- Guest count summaries
- Dietary requirement summaries
- Song request playlist generation

### **Admin Features**

- RSVP response dashboard
- Guest list management
- Response analytics
- Bulk communication tools

## Troubleshooting

### **Common Issues**

1. **Invalid RSVP Code**: Ensure codes are exactly 6 characters
2. **Form Not Loading**: Check database connectivity and table structure
3. **Submission Errors**: Verify all required fields are completed

### **Debug Mode**

Enable console logging for detailed error information during development.

## Testing

The RSVP system has comprehensive test coverage:

### **E2E Tests** (`cypress/e2e/rsvp.cy.ts`)

- Code entry and validation (valid/invalid codes)
- Code formatting (uppercase conversion, length requirements)
- Complete RSVP submission (accepting and declining)
- Guest selection validation
- Villa question conditional display
- Form field validation
- RSVP editing functionality
- Database verification
- Success page with query parameters
- Direct link navigation
- Error handling

See [cypress/README.md](cypress/README.md) for detailed test documentation.

### **Unit Tests**

- Custom hooks (`useRSVPForm`)
- Form validation logic
- API route handlers

See [TESTING.md](TESTING.md) for unit testing documentation.

## Support

For technical support or questions about the RSVP system implementation, refer to the codebase documentation or contact the development team.
