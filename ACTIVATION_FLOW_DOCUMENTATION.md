# Complete Signup & Account Activation Flow Documentation

## Overview
This document outlines the complete sessionless activation flow that allows unactivated users to either:
1. Activate immediately after email verification (without login)
2. Activate later when they attempt to login (if they didn't activate immediately)

---

## User Flows

### Flow 1: Email Verification → Immediate Activation (No Login Required)

```
User Signs Up
    ↓
Registration creates: is_verified=false, approval_status='pending', rank='Unactivated'
    ↓
Verification email sent with link containing token
    ↓
User clicks link → /auth/confirm?token=xxx
    ↓
ConfirmContent verifies token and:
  - Calls /api/auth/verify-email with token
  - Token validated and user updated: is_verified=true, status='inactive'
  - Email stored in sessionStorage: sessionStorage.setItem('activation_email', email)
  - Redirects to /auth/activate
    ↓
ActivateComponent (SESSIONLESS):
  - Reads email from sessionStorage
  - Calls /api/activate/status (sessionless, no session required)
  - Shows activation form with phone number input
    ↓
User enters phone number and submits
    ↓
ActivateComponent calls /api/activate/initiate (sessionless)
    ↓
M-Pesa STK Push initiated
    ↓
User completes M-Pesa payment
    ↓
Payment verified → /auth/activate/mpesa-waiting
    ↓
User approved by admin
    ↓
User can login and access dashboard
```

### Flow 2: Unactivated User Tries to Login (Login-Time Activation)

```
User tries to login with email/password
    ↓
/auth/login receives credentials and submits via signIn('credentials')
    ↓
NextAuth validates credentials in auth.ts
    ↓
User profile loaded with: is_verified=true, is_active=false
    ↓
Login succeeds, session created
    ↓
LoginContent checks user status via checkUserStatusAndRedirect()
    ↓
Detects: !user.isActivationPaid && !user.activation_paid_at
    ↓
BEFORE REDIRECT: Stores email in sessionStorage
  sessionStorage.setItem('activation_email', user.email)
    ↓
Redirects to /auth/activate
    ↓
ActivateComponent (HYBRID - Can use session OR sessionStorage):
  - Priority 1: sessionStorage.getItem('activation_email')
  - Priority 2: searchParams.get('email') (URL fallback)
  - Reads email and proceeds
    ↓
Rest of flow same as Flow 1...
```

### Flow 3: User Returns Later Without Activation

```
User didn't activate during email verification
    ↓
Days/weeks later, user tries to login
    ↓
Follows Flow 2: Login → Status Check → Redirect to Activation
    ↓
Can complete activation at any time
```

---

## Key Components & Their Responsibilities

### 1. **Login Page** (`/app/auth/login/page.tsx`)
- **Server Component**: Checks if user has session with incomplete status
- If session exists and user unactivated → Server-side redirect to `/auth/activate`
- Shows login form without auto-redirecting (allows users to login with different account)

### 2. **LoginContent** (`/app/auth/login/LoginContent.tsx`)
- **Client Component**: Handles email/password login form
- On successful login:
  1. Calls `checkUserStatusAndRedirect()`
  2. Fetches latest session data
  3. Detects unactivated users
  4. **NEW**: Stores email in sessionStorage BEFORE redirect
  5. Redirects to `/auth/activate`

**Key Code Addition** (Fixed):
```typescript
// Check activation payment
if (!user.isActivationPaid && !user.activation_paid_at) {
  console.log('User - Activation not paid, redirecting to activate');
  // Store email in sessionStorage so activation page can work without session
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('activation_email', user.email);
  }
  router.push('/auth/activate');
  return;
}
```

### 3. **ConfirmContent** (`/app/auth/confirm/ConfirmContent.tsx`)
- **Client Component**: Verifies email after email link click
- Calls `/api/auth/verify-email` with token
- On success:
  1. Extracts email from API response
  2. Stores in sessionStorage: `sessionStorage.setItem('activation_email', email)`
  3. Redirects to `/auth/activate` (no login session needed)

### 4. **ActivateComponent** (`/app/auth/activate/ActivateComponent.tsx`)
- **Client Component**: Works WITHOUT session (fully sessionless)
- **Email Resolution Priority**:
  1. `sessionStorage.getItem('activation_email')` (from login or confirm)
  2. `searchParams.get('email')` (URL fallback)
  3. If none found → "Session Expired" error

- **Behavior**:
  - Calls `/api/activate/status` (sessionless) to check if already activated
  - If not activated → Shows phone number form
  - On submit → Calls `/api/activate/initiate` (sessionless)
  - Gets checkoutRequestId → Redirects to M-Pesa waiting page

### 5. **API: /api/activate/status** (SESSIONLESS)
```typescript
POST /api/activate/status
Body: { email: 'user@example.com' }

- Looks up user by email
- REQUIRES: User is_verified=true (prevents bypass)
- Checks: approval_status !== 'pending' || rank !== 'Unactivated'
- Returns: { activation_paid, approval_status, is_approved, ... }
```

### 6. **API: /api/activate/initiate** (SESSIONLESS)
```typescript
POST /api/activate/initiate
Body: { email: 'user@example.com', phoneNumber: '254...' }

- Looks up user by email
- REQUIRES: User is_verified=true
- REQUIRES: User not already activated
- Creates ActivationPayment & ActivationLog records
- Initiates M-Pesa STK Push
- Returns: { checkoutRequestId, merchantRequestId, ... }
```

### 7. **API: /api/auth/verify-email** (SESSIONLESS)
```typescript
POST /api/auth/verify-email
Body: { token: 'xxx' }

On Success:
- Updates user: is_verified=true, status='inactive'
- Keeps: approval_status='pending', is_active=false
- Returns user.email for ConfirmContent to store in sessionStorage
```

### 8. **Auth Configuration** (`auth.ts`)
- **JWT Callback**: Calculates `isActivationPaid`:
  ```typescript
  const isActivationPaid = profile.approval_status !== 'pending' || profile.rank !== 'Unactivated';
  ```
- **Session Callback**: Includes `isActivationPaid` in session for frontend checks

---

## Critical Validation Points

### Email Verification Check
Every sessionless endpoint requires: `user.is_verified === true`
- Prevents users from bypassing email verification
- Ensures email is legitimate before payment collection

### Activation Status Check
Endpoints check: `approval_status === 'pending' && rank === 'Unactivated'`
- Prevents double-activation attempts
- Clear state machine: pending → approved → active

### Phone Number Validation
```typescript
const c = phone.replace(/\s/g, '');
return (c.startsWith('0') && c.length === 10) || (c.startsWith('254') && c.length === 12);
```
- Accepts: 07XXXXXXXX or 2547XXXXXXXX
- Formats to: 254XXXXXXXXX for M-Pesa

---

## Sessionless Design Benefits

1. **Works across browser tabs**: Users can close/reopen without losing state
2. **Works on mobile**: No session timeout issues
3. **Works with caching**: No session cookies interfere with cache
4. **Works with redirects**: Users can refresh page at any step
5. **No server session state**: Stateless design scales better

---

## User State Transitions

```
Signup
  ↓ (is_verified=true)
Email Verified → Ready for Activation
  ↓ (approval_status ≠ 'pending')
Payment Received → Waiting for Admin
  ↓ (is_approved=true)
Admin Approved → Active
  ↓ (is_active=true)
Ready to Use → Dashboard Access
```

---

## Error Scenarios & Handling

### 1. User Lost Email
**Solution**: Resend verification email
- Endpoint: `/api/auth/resend-verification`
- Click resend → New token → New email → Same flow

### 2. User Tried to Login Without Email Verification
**Solution**: Blocked by validation
- Credentials provider checks: `!user.is_verified`
- Error: "Please verify your email before logging in"

### 3. User Didn't Activate During Email Verification
**Solution**: Activate when trying to login
- Login succeeds → Status check → Redirect to activation
- Email stored in sessionStorage → Can activate immediately

### 4. User Abandoned Activation at Phone Number Form
**Solution**: Resume activation on next login
- Next login → Same email stored in sessionStorage
- Can immediately resume M-Pesa payment

### 5. User Never Receives Activation Email
**Solution**: Can still activate at login time
- Login redirects to activation page with email in sessionStorage
- Uses sessionless API to initiate payment

---

## Testing Checklist

- [ ] User can signup and receive verification email
- [ ] User can click email verification link
- [ ] Email verification redirects to activation (sessionless)
- [ ] Activation page loads without login session
- [ ] Phone number validation works (07XX and 254 formats)
- [ ] M-Pesa STK Push initiates correctly
- [ ] User can abandon activation and login later
- [ ] User redirected to activation on login if unactivated
- [ ] Email stored in sessionStorage for activation page
- [ ] Activation page reads email from sessionStorage
- [ ] Session timeout doesn't affect activation flow
- [ ] Browser refresh doesn't lose email in sessionStorage
- [ ] Can resend verification email if token expires
- [ ] Cannot activate if email not verified
- [ ] Cannot activate if already activated

---

## Related Files

- `/app/auth/login/LoginContent.tsx` - Login form with activation redirect
- `/app/auth/activate/ActivateComponent.tsx` - Activation form (sessionless)
- `/app/auth/confirm/ConfirmContent.tsx` - Email verification
- `/app/api/activate/status/route.ts` - Check activation status (sessionless)
- `/app/api/activate/initiate/route.ts` - Initiate payment (sessionless)
- `/app/api/auth/verify-email/route.ts` - Verify email token
- `/auth.ts` - NextAuth configuration with JWT callbacks
- `/app/actions/activation.ts` - Server actions for activation

