# Complete Activation & Session Flow Documentation

## Overview
This document describes the complete user activation flow from signup to dashboard access, including how sessions work at each stage.

## User States & Transitions

### State 1: Unverified User (Just Signed Up)
**Database Fields:**
- `is_verified: false`
- `email_verified_at: null`
- `is_active: false`
- `is_approved: false`
- `activation_paid_at: null`
- `approval_status: 'pending'`
- `rank: 'Unactivated'`
- `status: 'pending'`

**Session Status:** Can login (credentials pass), but dashboard redirects to login page with `?status=unverified_email`

**What Happens:**
1. User gets verification email
2. User clicks verification link in email
3. Email is verified in `/api/auth/verify-email`
4. User redirected to `/auth/confirm?token=...`

---

### State 2: Verified but Not Activated (Email Verified, No Payment)
**Database Fields:**
- `is_verified: true` ✅
- `email_verified_at: "2024-05-11T12:00:00Z"`
- `is_active: false`
- `is_approved: false`
- `activation_paid_at: null`
- `approval_status: 'pending'`
- `rank: 'Unactivated'`
- `status: 'pending'`

**Session Status:** Can login, session includes `is_verified: true` and `isActivationPaid: false`

**Session Flow:**
1. User enters credentials in login form
2. JWT callback creates token with `is_verified: true, is_active: false`
3. Session callback populates session with these values
4. Dashboard layout checks: `if (!session.user.is_active) redirect('/auth/activate')`
5. User lands on `/auth/activate` page (sessionless - doesn't require active session)

**What Happens:**
1. User enters phone number
2. M-Pesa STK push initiated
3. User enters M-Pesa PIN
4. M-Pesa processes payment (KES 100)
5. System queries M-Pesa API for confirmation
6. Payment confirmed → database updated with `activation_paid_at`

---

### State 3: Activated but Not Approved (Payment Made, Awaiting Admin)
**Database Fields:**
- `is_verified: true` ✅
- `email_verified_at: "2024-05-11T12:00:00Z"`
- `is_active: false` (remains false until admin approves)
- `is_approved: false`
- `activation_paid_at: "2024-05-11T14:20:00Z"` ✅
- `approval_status: 'pending'`
- `rank: 'Unactivated'`
- `status: 'pending'`

**Session Status:** Can login, session includes `isActivationPaid: true` but `is_approved: false`

**Session Flow:**
1. User logs in again
2. JWT callback detects `activation_paid_at` is not null → sets `isActivationPaid: true`
3. Session callback propagates this to session
4. Dashboard layout checks: `if (!session.user.is_approved) redirect('/auth/pending-approval')`
5. User lands on `/auth/pending-approval` (shows waiting message)

**What Happens:**
- Admin reviews account in admin dashboard
- Admin clicks "Approve" button
- Database fields updated:
  - `is_active: true` ✅
  - `is_approved: true` ✅
  - `approval_status: 'approved'`
  - `approval_at: current_datetime`

---

### State 4: Fully Approved (Ready for Dashboard)
**Database Fields:**
- `is_verified: true` ✅
- `email_verified_at: "2024-05-11T12:00:00Z"`
- `is_active: true` ✅
- `is_approved: true` ✅
- `activation_paid_at: "2024-05-11T14:20:00Z"` ✅
- `approval_status: 'approved'` ✅
- `rank: 'Active'` (should be updated by admin on approval)
- `status: 'active'`

**Session Status:** Fully authenticated, can access dashboard

**Session Flow:**
1. User logs in
2. JWT callback creates complete token with all fields true
3. Session callback populates session
4. Dashboard layout checks all statuses:
   - `is_verified: true` ✅
   - `is_active: true` ✅
   - `is_approved: true` ✅
5. All checks pass → User can access dashboard

---

## Critical Session Handling Rules

### Rule 1: Never Block Verified Users
- Verified users (email confirmed) MUST be able to login
- They may be redirected to activation page, but login must succeed

### Rule 2: Use is_verified, is_active, is_approved Flags
- `is_verified`: Email verified via link in email
- `is_active`: Payment received (detected by `activation_paid_at != null`)
- `is_approved`: Admin approved the account

### Rule 3: isActivationPaid Detection
```
isActivationPaid = (activation_paid_at !== null && activation_paid_at !== undefined)
```
NOT based on `approval_status` or `rank`

### Rule 4: Session Update on Payment
When payment is confirmed:
1. Database: Update `activation_paid_at` timestamp
2. Session: Will be refreshed on next activity
3. Dashboard: User will be redirected to pending-approval on next navigation

---

## Testing Each State

### Test Case 1: Verify Email
1. Create user: `is_verified: false`
2. Click verify link → Call `/api/auth/verify-email?token=...`
3. User should be `is_verified: true`
4. User redirected to `/auth/confirm`

### Test Case 2: Make Payment
1. Login with verified but unpaid user
2. Navigate to `/auth/activate`
3. Enter phone, initiate M-Pesa
4. Manually update DB: `activation_paid_at: new Date()`
5. Wait 4 seconds (polling interval)
6. Payment confirmed, user shown success message
7. Login again → should be redirected to `/auth/pending-approval`

### Test Case 3: Admin Approval
1. Login as admin
2. See unpaid user in pending approvals
3. Click approve
4. Database updated: `is_active: true, is_approved: true`
5. User logs in → Should access dashboard without redirects

---

## Database Update Sequence

### After Email Verification
```
UPDATE profile SET
  is_verified = true,
  email_verified_at = NOW(),
  status = 'pending',
  approval_status = 'pending'
WHERE email = 'user@example.com'
```

### After M-Pesa Payment
```
UPDATE profile SET
  activation_paid_at = NOW(),
  is_active = false,  -- Remains false until admin approval
  is_approved = false,
  approval_status = 'pending'
WHERE email = 'user@example.com'
```

### After Admin Approval
```
UPDATE profile SET
  is_active = true,
  is_approved = true,
  approval_status = 'approved',
  approval_by = 'admin_id',
  approval_at = NOW(),
  rank = 'Active',
  status = 'active'
WHERE email = 'user@example.com'
```

---

## Session Refresh Triggers
Session is refreshed (JWT callback runs) when:
1. User logs in (new session created)
2. User navigates to authenticated route (session checked)
3. User manually updates session via `update()` function
4. Session expires and is renewed (30-day max age)

---

## Common Issues & Fixes

### Issue: User stuck on activation page after payment
**Cause:** `activation_paid_at` not updated in DB
**Fix:** Verify M-Pesa callback is updating DB correctly

### Issue: User can't login after being unverified
**Cause:** Credentials provider checking `is_verified`
**Fix:** Remove is_verified check from authorize(), let dashboard layout handle redirects

### Issue: Session not reflecting payment
**Cause:** JWT callback not fetching fresh data from DB
**Fix:** Ensure JWT callback runs on signIn trigger, not using stale token

### Issue: Payment marked as complete but user not notified
**Cause:** Polling interval too slow or API query not working
**Fix:** Reduce polling from 3s to 4s, ensure M-Pesa API query works
