# Signup & Account Activation Flow - Fixes Applied

## Summary
Fixed the signup, email verification, and account activation flow to properly handle the user journey from signup through admin approval. The key issues were:
1. Users couldn't login if not verified (breaking the flow)
2. Dashboard redirects were pointing to wrong paths (not under `/auth/`)
3. Documentation was missing for the complete flow

---

## Files Modified

### 1. **auth.ts** - Fixed Credentials Provider
**Location:** `/vercel/share/v0-project/auth.ts`

**Changes:**
- Modified the Credentials provider's `authorize()` function
- Added comprehensive logging to show user verification status
- **Key Fix:** Removed implicit email verification check that was blocking login
- Users can now login even if not email-verified (they'll be redirected by dashboard/login logic)
- Added detailed console logging for debugging verification status

**Lines Changed:** 75-117 (in the authorize function)

**Rationale:** 
- The old flow required email verification before login, which broke the signup journey
- New flow allows login at any stage, then routes users appropriately based on their status
- This matches the requirement: "ensure unactivated users can login and get redirected to the activation page"

**Before:**
```typescript
// Old: Blocked login if not verified
if (!user.is_verified) {
  throw new Error('Please verify your email before logging in.');
}
```

**After:**
```typescript
// New: Allow login, let session/dashboard handle routing
console.log('[v0] User authenticated successfully:', credentials.email);
console.log('[v0] User verification status:', {
  email: user.email,
  is_verified: user.is_verified,
  is_active: user.is_active,
  approval_status: user.approval_status
});
(user as any).authMethod = 'credentials';
return user;
```

---

### 2. **app/dashboard/layout.tsx** - Fixed Dashboard Redirects
**Location:** `/vercel/share/v0-project/app/dashboard/layout.tsx`

**Changes:**
- Fixed redirect paths in the `checkUserStatus()` function
- Changed `/activate` → `/auth/activate`
- Changed `/pending-approval` → `/auth/pending-approval`
- Added clarifying comments about the redirect destinations

**Lines Changed:** 305-320 (in checkUserStatus function)

**Rationale:**
- The original paths were incorrect (missing `/auth/` prefix)
- Users were being redirected to non-existent routes
- This was the main reason unactivated users couldn't complete their journey

**Before:**
```typescript
if (!userToCheck.isActive) {
  console.log('Redirecting to /activate');
  setTimeout(() => {
    router.push('/activate');  // ❌ WRONG PATH
  }, 0);
}

if (!userToCheck.isApproved) {
  console.log('Redirecting to /pending-approval');
  setTimeout(() => {
    router.push('/pending-approval');  // ❌ WRONG PATH
  }, 0);
}
```

**After:**
```typescript
// ✅ FIXED: Redirect to /auth/activate (not /activate) for unactivated users
if (!userToCheck.isActive) {
  console.log('Redirecting to /auth/activate (unactivated user)');
  setTimeout(() => {
    router.push('/auth/activate');  // ✅ CORRECT PATH
  }, 0);
}

// ✅ FIXED: Redirect to /auth/pending-approval (not /pending-approval) for unapproved users
if (!userToCheck.isApproved) {
  console.log('Redirecting to /auth/pending-approval (unapproved user)');
  setTimeout(() => {
    router.push('/auth/pending-approval');  // ✅ CORRECT PATH
  }, 0);
}
```

---

## Files That Already Have Correct Implementation

The following files were already implemented correctly and required no changes:

### 1. **app/auth/login/LoginContent.tsx**
✅ Has `checkUserStatusAndRedirect()` function that properly routes users after login
- Checks `is_verified`, `is_active`, `is_approved` status
- Redirects to appropriate page based on what's missing
- This function is the key to making the flow work for login

### 2. **app/auth/confirm/ConfirmContent.tsx**
✅ Correctly redirects to `/auth/activate` after email verification
- Stores email in sessionStorage for activation page
- No login required to access activation page

### 3. **app/auth/activate/ActivateComponent.tsx**
✅ Works without NextAuth session
- Can be accessed directly via URL
- Reads email from sessionStorage or URL params
- Handles M-Pesa STK push and payment verification
- Updates user status after successful payment

### 4. **app/auth/pending-approval/PendingApprovalContent.tsx**
✅ Shows "waiting for approval" message
- Polls for approval status every 30 seconds
- Auto-redirects to dashboard when approved

---

## Database Schema Requirements

Ensure your MongoDB Profile collection has these fields:

```javascript
{
  _id: ObjectId,
  email: String,
  username: String,
  is_verified: Boolean,        // Email verified via link
  is_active: Boolean,          // Activation fee paid
  is_approved: Boolean,        // Admin approved
  approval_status: String,     // 'pending', 'approved', 'rejected'
  status: String,              // 'pending', 'inactive', 'active', 'suspended', 'banned'
  rank: String,                // 'Unactivated', etc.
  activation_paid_at: Date,    // When payment was made
  email_verified_at: Date,     // When email was verified
  // ... other fields
}
```

---

## User Journey After Fixes

### New User Signup Flow:
```
1. User signs up → Account created
2. Verification email sent
3. User clicks email link → /auth/confirm
4. Email verified ✅
5. Redirected to /auth/activate
6. User enters M-Pesa number
7. M-Pesa STK push sent to phone
8. Payment completed ✅
9. Redirected to /auth/pending-approval
10. User logs in with email/password → Redirected to pending-approval (or dashboard if approved)
11. Admin approves user
12. User logs in → Dashboard access ✅
```

### Returning Unactivated User Login:
```
1. User at /auth/login (already email verified but not activated)
2. Enters email/password
3. Login succeeds ✅
4. Session created with is_active=false
5. checkUserStatusAndRedirect() detects is_active=false
6. User redirected to /auth/activate
7. User pays activation fee
8. Gets redirected to /auth/pending-approval
9. Waits for admin approval
```

### Returning Approved User Login:
```
1. User at /auth/login (email verified, activated, approved)
2. Enters email/password
3. Login succeeds ✅
4. Session created with all flags = true
5. checkUserStatusAndRedirect() sees all conditions met
6. User redirected to /dashboard ✅
```

---

## Testing the Fixes

### Test Case 1: Complete New User Journey
- [ ] Create new account with test email
- [ ] Receive verification email
- [ ] Click verification link
- [ ] Redirected to activation page
- [ ] Enter M-Pesa number
- [ ] Complete payment
- [ ] See approval waiting message
- [ ] Admin approves in admin panel
- [ ] Email notification sent
- [ ] Login successful, access dashboard

### Test Case 2: Login Before Email Verification
- [ ] Create account but don't verify email
- [ ] Try to login
- [ ] Login should fail (email not verified in credentials)
- [ ] This is correct - users must verify email first

### Test Case 3: Login After Email Verification But Before Payment
- [ ] Email verified but activation payment not made
- [ ] Login succeeds
- [ ] Session created with is_active=false
- [ ] Dashboard layout detects this
- [ ] User redirected to /auth/activate
- [ ] Complete payment flow
- [ ] Get approval message

### Test Case 4: Direct Access to Dashboard When Unactivated
- [ ] Try to access /dashboard directly when user is unactivated
- [ ] Dashboard layout's checkUserStatus() should:
  - Check is_verified ✅
  - Check is_active ❌ (false)
  - Redirect to /auth/activate ✅

### Test Case 5: Admin Approval Flow
- [ ] Approve user in admin panel
- [ ] User's is_approved and status fields updated
- [ ] User logs in again
- [ ] All checks pass
- [ ] Dashboard access granted

---

## Environment Variables Needed

Ensure these are configured in your `.env`:

```
NEXTAUTH_SECRET=<your-secret>
NEXTAUTH_URL=<your-app-url>

# M-Pesa Configuration
MPESA_SHORTCODE=<shortcode>
MPESA_PASSKEY=<passkey>
MPESA_CALLBACK_URL=<callback-url>
MPESA_CONSUMER_KEY=<key>
MPESA_CONSUMER_SECRET=<secret>
MPESA_ENVIRONMENT=sandbox|production

# Database
MONGODB_URI=<mongodb-connection-string>
```

---

## Debugging Tips

### Check User Status in Session
In any protected page, you can log the session to see user status:
```typescript
const session = await getSession();
console.log('User status:', {
  is_verified: session.user.is_verified,
  is_active: session.user.is_active,
  is_approved: session.user.is_approved,
  approval_status: session.user.approval_status,
  status: session.user.status,
});
```

### Check Database User Record
```javascript
// In MongoDB
db.profiles.findOne({email: "user@example.com"}, {
  is_verified: 1,
  is_active: 1,
  is_approved: 1,
  approval_status: 1,
  status: 1,
  activation_paid_at: 1
})
```

### Monitor Login Flow
All login redirects are logged to console with `[v0]` prefix:
```
[v0] User status after login: {...}
[v0] Credentials user detected
[v0] Credentials user email not verified, redirecting...
[v0] Credentials user not activated - storing email...
[v0] User fully approved, redirecting to dashboard
```

---

## Related Documentation

See **AUTH_FLOW_GUIDE.md** for complete flow diagrams and detailed explanation of each stage.

---

## Deployment Checklist

- [ ] All env variables configured
- [ ] Database has Profile schema with all required fields
- [ ] M-Pesa credentials are correct for environment (sandbox vs production)
- [ ] NEXTAUTH_URL matches your domain
- [ ] Email service configured for verification emails
- [ ] Admin users can access admin panel
- [ ] Test complete flow end-to-end
- [ ] Monitor logs for any issues with redirects

