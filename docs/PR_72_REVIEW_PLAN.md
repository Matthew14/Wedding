# PR #72 Review Response Plan

**PR**: fix: implement secure RLS policies for all tables
**Reviewer**: Claude Code
**Date**: January 6, 2026

---

## Review Summary

The reviewer gave a 4/5 rating with APPROVE and minor suggestions. No blocking issues were identified, but several improvements are recommended.

---

## Action Items

### 1. Table-Prefixed Policy Names (Medium Priority)

**Issue**: Multiple tables have policies with identical names, which can cause confusion during debugging.

**Current**:
```sql
CREATE POLICY "Allow public select" ON public.invitation ...
CREATE POLICY "Allow public select" ON public."RSVPs" ...
```

**Proposed**:
```sql
CREATE POLICY "invitation_public_select" ON public.invitation ...
CREATE POLICY "rsvps_public_select" ON public."RSVPs" ...
```

**Tasks**:
- [ ] Rename all policies to use table-prefixed naming convention
- [ ] Update corresponding COMMENT statements
- [ ] Apply changes to production via MCP

---

### 2. Document Security Assumptions (Low Priority)

**Issue**: The UPDATE policies use `USING (true)` which allows updating any row. This is acceptable because:
- The anon key is not exposed to clients
- All mutations go through API endpoints that validate RSVP codes
- RLS serves as defense-in-depth, not primary access control

**Tasks**:
- [ ] Add comment block at top of migration explaining security model
- [ ] Document assumption that anon key remains server-side only

---

### 3. Add Comments for Authenticated Policies (Low Priority)

**Issue**: Only public policies have COMMENT statements; authenticated policies don't.

**Tasks**:
- [ ] Add COMMENT for "Allow authenticated all" on invitation
- [ ] Add COMMENT for "Allow authenticated all" on RSVPs
- [ ] Add COMMENT for "Allow authenticated all" on invitees
- [ ] Add COMMENT for "Allow authenticated insert/update/delete" on FAQs

---

### 4. Document INSERT/DELETE Restrictions (Low Priority)

**Issue**: No explicit documentation that public users cannot INSERT/DELETE.

**Tasks**:
- [ ] Add inline comments explaining what operations are NOT permitted
- [ ] Consider adding a "Security Notes" section in the migration

---

## Items NOT Addressed (Intentionally)

### Mixed Quote Styles
- **Reason**: Follows original schema naming conventions (`RSVPs`, `FAQs` require quotes)
- **Action**: None needed

### Row-Level UPDATE Filtering
- **Reason**: Would require architectural changes (RPC functions or JWT claims)
- **Current mitigation**: API validates codes; anon key not exposed
- **Action**: Tracked as future enhancement, not blocking

---

## Implementation Order

1. **Rename policies** (biggest impact on maintainability)
2. **Add security model documentation** (clarifies intent)
3. **Add missing COMMENT statements** (consistency)
4. **Add inline comments for restrictions** (documentation)

---

## Testing After Changes

- [ ] Run `supabase db reset` locally
- [ ] Verify all 62 E2E tests pass
- [ ] Test production FAQ page still works after applying via MCP
- [ ] Verify Supabase dashboard shows correct policy names

---

## Estimated Effort

| Task | Time |
|------|------|
| Rename policies | 15 min |
| Add documentation | 10 min |
| Add missing comments | 5 min |
| Testing | 10 min |
| **Total** | ~40 min |
