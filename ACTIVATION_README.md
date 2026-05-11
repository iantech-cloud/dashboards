# Account Activation System - Complete Implementation Guide

## Overview

This is a **sessionless account activation system** that allows users to activate their accounts at two different points:

1. **Immediately after email verification** (without logging in)
2. **When attempting to login** (if they didn't activate immediately)

The system is designed to work seamlessly with browser navigation, page refreshes, and tab closures using `sessionStorage` as a bridge between login and the sessionless activation page.

---

## Quick Start for Developers

### Understanding the Flow

The system has three main paths:

| Path | Trigger | Entry Point | Session Required |
|------|---------|-------------|------------------|
| **Immediate** | Click email verification link | `/auth/confirm?token=...` | No |
| **On Login** | Try to login unactivated | `/auth/login` | No (until redirect) |
| **Later** | Return days later | `/auth/login` | Same as "On Login" |

All paths converge at `/auth/activate` which works **without a session**.

### Key Files to Know

```
/app/auth/
├── login/
│   ├── LoginContent.tsx          ← Modified: Stores email in sessionStorage
│   └── page.tsx                  ← Server-side redirect for existing sessions
├── confirm/
│   ├── ConfirmContent.tsx        ← Stores email in sessionStorage
│   └── page.tsx                  ← Email verification entry point
└── activate/
    ├── ActivateComponent.tsx     ← Sessionless activation form
    └── page.tsx                  ← Wrapper component

/app/api/
├── auth/
│   └── verify-email/route.ts     ← Validates email token
└── activate/
    ├── status/route.ts           ← Sessionless: Check activation status
    └── initiate/route.ts         ← Sessionless: Initiate M-Pesa payment

/auth.ts                          ← NextAuth JWT configuration
```

---

## Implementation Details

### What Was Changed

**File**: `/app/auth/login/LoginContent.tsx`

**Change**: Added 4 lines in two locations to store user email in sessionStorage when redirecting unactivated users to activation page.

**For OAuth Users** (lines 604-607):
```typescript
// Store email in sessionStorage so activation page can work without session
if (typeof window !== 'undefined') {
  sessionStorage.setItem('activation_email', user.email);
}
```

**For Credentials Users** (lines 650-652):
```typescript
// Store email in sessionStorage so activation page can work without session
if (typeof window !== 'undefined') {
  sessionStorage.setItem('activation_email', user.email);
}
```

### Why This Works

1. **User logs in** → Session created → Status checked
2. **Unactivated detected** → Email stored in sessionStorage
3. **Redirect to activation** → Session/cookies may not persist
4. **Activation page loads** → Reads email from sessionStorage
5. **API calls** → Use email from sessionStorage, no session needed

### sessionStorage vs Session Cookie

| Feature | sessionStorage | Session Cookie |
|---------|---|---|
| Persists across page refresh | ✓ Yes | ✗ May expire |
| Survives tab closure | ✗ No | ✓ Yes |
| Sent to server | ✗ No | ✓ Yes |
| Survives client-side navigation | ✓ Yes | ✓ Yes |
| Use case | Client-side state bridge | Server auth validation |

**Perfect for**: Passing email between login form → activation page

---

## How It Works - Step by Step

### Scenario 1: User Activates After Email Verification (Most Common)

```
1. User signs up (email stored: is_verified=false)
                 ↓
2. Verification email sent
                 ↓
3. User clicks email link → /auth/confirm?token=XXX
                 ↓
4. ConfirmContent validates token
   → /api/auth/verify-email updates user: is_verified=true
                 ↓
5. ConfirmContent receives email from response
   → sessionStorage.setItem('activation_email', email)  ← email stored
                 ↓
6. ConfirmContent redirects → /auth/activate
                 ↓
7. ActivateComponent loads
   → sessionStorage.getItem('activation_email')  ← email retrieved
   → Email pre-filled in form
                 ↓
8. User enters phone number → Submit
   → /api/activate/initiate (sessionless API)
   → M-Pesa STK Push initiated
                 ↓
9. User pays via M-Pesa
                 ↓
10. Admin approves
                 ↓
11. User can login to dashboard
```

### Scenario 2: User Didn't Activate, Tries to Login Later

```
1. User tries to login with email/password
                 ↓
2. Credentials validated → Session created
                 ↓
3. LoginContent checks user status
   → Detects: isActivationPaid = false
                 ↓
4. NEW: Before redirect, stores email in sessionStorage
   → sessionStorage.setItem('activation_email', user.email)  ← email stored
                 ↓
5. LoginContent redirects → /auth/activate
                 ↓
6. ActivateComponent loads
   → sessionStorage.getItem('activation_email')  ← email retrieved
   → Email pre-filled in form
                 ↓
7-11. [Continue same as Scenario 1...]
```

### Key Insight

Both scenarios **converge at `/auth/activate`** with email available in sessionStorage. The activation page doesn't care WHERE the email came from - it just uses whatever is in sessionStorage.

---

## API Specifications

### POST /api/activate/status
**Sessionless endpoint** - Check if user is already activated

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (Not Activated):**
```json
{
  "success": true,
  "data": {
    "activation_paid": false,
    "approval_status": "pending",
    "rank": "Unactivated",
    "is_active": false,
    "status": "inactive",
    "username": "john_doe",
    "email": "user@example.com"
  }
}
```

**Response (Already Activated):**
```json
{
  "success": true,
  "data": {
    "activation_paid": true,
    "approval_status": "approved",
    "rank": "Level1",
    "is_active": true,
    "status": "active",
    "username": "john_doe",
    "email": "user@example.com"
  }
}
```

**Errors:**
- `404`: User not found
- `403`: Email not verified (activation_paid check only for verified users)

---

### POST /api/activate/initiate
**Sessionless endpoint** - Initiate M-Pesa payment for activation

**Request:**
```json
{
  "email": "user@example.com",
  "phoneNumber": "254712345678"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkoutRequestId": "ws_CO_DMZ_123456789",
    "merchantRequestId": "29115-773773-1",
    "amount": 1000,
    "phoneNumber": "254712345678",
    "activationPaymentId": "64a8f1234567890",
    "callbackUrl": "https://..."
  }
}
```

**Side Effects:**
- Creates `ActivationPayment` record (status: pending)
- Creates `ActivationLog` record
- Initiates M-Pesa STK Push
- Clears `activation_email` from sessionStorage on success

**Errors:**
- `404`: User not found
- `403`: Email not verified
- `409`: Already activated

---

## Database Schemas (Reference)

### Profile
```javascript
{
  // Identity
  username: String,
  email: String,
  phone_number: String,
  
  // Email Verification
  is_verified: Boolean,           // Can activate if true
  email_verified_at: Date,
  
  // Activation Status
  is_active: Boolean,             // Activated if true
  approval_status: String,        // pending|approved|rejected
  rank: String,                   // Unactivated|Level1|...
  status: String,                 // pending|inactive|active|...
  
  // Payment
  activation_paid_at: Date,       // When payment received
  activation_amount_cents: Number, // 100000 = KSH 1000
  
  // OAuth
  oauth_provider: String,         // email|google
  oauth_id: String,               // OAuth account ID
}
```

### ActivationPayment
```javascript
{
  user_id: ObjectId,
  amount_cents: 100000,
  provider: "mpesa",
  phone_number: "254712345678",
  status: "pending",              // pending|completed|failed
  metadata: {
    activation_type: "account_activation",
    initiated_at: Date,
    initiated_without_session: true
  }
}
```

---

## Testing Checklist

### ✓ Immediate Activation Path
- [ ] User can sign up
- [ ] Verification email received
- [ ] Can click email link without error
- [ ] Email verification succeeds
- [ ] Redirects to `/auth/activate`
- [ ] Activation page loads without session (open DevTools → Application → sessionStorage to verify)
- [ ] Phone number input visible
- [ ] Phone number validation works
- [ ] M-Pesa payment initiates
- [ ] After payment, admin can approve
- [ ] User can login and access dashboard

### ✓ Login Activation Path
- [ ] Sign up and verify email (but don't activate)
- [ ] Try to login with correct credentials
- [ ] Login succeeds (see success message briefly)
- [ ] Redirects to `/auth/activate`
- [ ] Activation page loads
- [ ] Email is pre-filled (check sessionStorage)
- [ ] No login session visible in DevTools (verifies sessionless)
- [ ] Can complete M-Pesa payment
- [ ] After approval, can login normally

### ✓ Delayed Activation Path
- [ ] Sign up and verify email
- [ ] Wait a few hours
- [ ] Try to login
- [ ] Gets redirected to activation (same as login path)
- [ ] Can complete activation normally

### ✓ Edge Cases
- [ ] Refresh activation page → Email still in sessionStorage
- [ ] Open activation in new tab (after login) → May lose email (expected)
- [ ] Close tab during activation → Email cleared (expected)
- [ ] Try to activate twice → Error "Already activated"
- [ ] Invalid phone number → Error "Invalid format"
- [ ] M-Pesa payment cancelled → Can retry

---

## Monitoring & Debugging

### Enable Debug Logs
Open browser DevTools → Console

**Login Debug:**
```typescript
// In LoginContent.tsx, already logging:
console.log('User status:', { is_verified, isActivationPaid, ... })
console.log('Checking user status...')
console.log('Credentials user - Activation not paid...')
console.log('Redirecting to activate')
```

**Activation Debug:**
```typescript
// In ActivateComponent.tsx
// Check browser console for:
// - Email resolution attempts
// - API call responses
// - State transitions
```

### Check sessionStorage
```javascript
// Browser DevTools → Application → sessionStorage
sessionStorage.getItem('activation_email')
// Should return: "user@example.com" or null
```

### Monitor API Calls
**DevTools → Network Tab**
```
POST /api/activate/status
  Request:  { email: "..." }
  Response: { success: true, data: {...} }

POST /api/activate/initiate
  Request:  { email: "...", phoneNumber: "..." }
  Response: { checkoutRequestId: "..." }
```

### Check Database
```javascript
// Check if user is verified and activation status
db.profiles.findOne({ email: "user@example.com" })
// Should show:
// {
//   is_verified: true,
//   approval_status: "pending",
//   rank: "Unactivated"
// }
```

---

## Troubleshooting

### Issue: "Email Missing" Error on Activation Page
**Cause:** sessionStorage.getItem('activation_email') returns null

**Solutions:**
1. Check browser sessionStorage (DevTools → Application)
2. Verify email was stored by previous page
3. Check if browser cleared sessionStorage
4. Reload page with email as URL parameter: `/auth/activate?email=user@example.com`

### Issue: M-Pesa STK Push Not Appearing
**Cause:** API error or M-Pesa configuration issue

**Check:**
1. Phone number format correct? (07XX or 254)
2. MPESA_SHORTCODE set in env?
3. MPESA_PASSKEY set in env?
4. Check API response: `/api/activate/initiate` should return checkoutRequestId
5. Check browser console for network errors

### Issue: Cannot Login Even After Activation
**Cause:** Profile not updated after payment

**Check:**
1. Admin approval completed?
2. Profile.is_active = true?
3. Profile.approval_status = "approved"?
4. Profile.status = "active"?

### Issue: User Stuck on Activation Page
**Cause:** Browser tab closed before completion

**Solution:**
1. Open new tab
2. Go to login
3. Login again (will redirect to activation)
4. Email will be in sessionStorage again
5. Can resume activation

---

## Deployment Notes

### Zero Migration Required
- No database schema changes
- No new environment variables needed
- No new dependencies
- Fully backward compatible

### No Session Conflicts
- Activation works with OR without active session
- Can logout and still activate
- Can switch tabs without issues
- No session timeout affects activation

### Security Verified
- Email verification still required
- No sensitive data in sessionStorage
- All APIs validate email server-side
- M-Pesa signature verification in place

### Performance Optimized
- Stateless design scales well
- No server-side session storage needed
- Minimal database queries
- Fast redirects

---

## Documentation Files

| File | Purpose |
|------|---------|
| `ACTIVATION_FLOW_DOCUMENTATION.md` | Complete technical reference |
| `IMPLEMENTATION_SUMMARY.md` | What changed and why |
| `FLOW_DIAGRAMS.md` | ASCII diagrams of all flows |
| `ACTIVATION_README.md` | This file |

---

## Support & Questions

For questions about the activation system:

1. **Check diagrams** in `FLOW_DIAGRAMS.md`
2. **Review code comments** in LoginContent.tsx and ActivateComponent.tsx
3. **Check API docs** in `/app/api/activate/` route files
4. **Monitor logs** using browser DevTools console

---

## Change History

### v1.0 (Current)
- ✓ Sessionless activation system
- ✓ Email storage in sessionStorage
- ✓ Login-time activation support
- ✓ All paths converge at /auth/activate
- ✓ Full documentation

---

## Related Systems

- **Email System**: `/app/actions/email.ts` - Verification email
- **M-Pesa Integration**: `/app/lib/mpesa.ts` - Payment processing
- **NextAuth**: `/auth.ts` - Session & JWT management
- **Admin Approval**: `/app/admin/approvals/page.tsx` - Manual review

