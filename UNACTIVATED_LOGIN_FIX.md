# Unactivated User Login Fix

## Problem
Unactivated users were being blocked instead of redirected to the activation page when trying to login. This prevented them from completing the activation process.

## Root Cause
When unactivated users (who already had sessions) tried to login:
1. The login form submission would succeed
2. `checkUserStatusAndRedirect()` would redirect to `/auth/activate`
3. However, the email wasn't being reliably passed to the activation page
4. The activation page would show "Session Expired" when it couldn't find the email

## Solution
Three-pronged approach to ensure the email always reaches the activation page:

### 1. **sessionStorage (Primary)**
- Email is stored in browser's `sessionStorage` when redirecting to activation
- Works for client-side redirects from the login form
- Persists across page reloads within the same tab

### 2. **URL Parameter (Fallback)**
- Email is encoded in the URL when redirecting to activation
- Works for server-side redirects from the login page
- Accessible even if sessionStorage fails or is disabled

### 3. **Enhanced Error Handling**
- Better logging to diagnose where redirects fail
- Try-catch blocks around sessionStorage operations
- Improved error messages for users

## Changes Made

### `/app/auth/login/LoginContent.tsx`
- Enhanced `checkUserStatusAndRedirect()` function with:
  - Better error handling for session fetch failures
  - Try-catch blocks around sessionStorage operations
  - Detailed debug logging with `[v0]` prefix
  - Stores email in sessionStorage before redirecting (lines 606, 651)

### `/app/auth/login/page.tsx`
- Server-side redirect now encodes email in URL:
  ```javascript
  redirect(`/auth/activate?email=${encodeURIComponent(user.email)}`);
  ```
- Ensures unactivated users don't get blocked at page load

### `/app/auth/confirm/ConfirmContent.tsx`
- Also passes email in URL when redirecting to activation page
- Maintains consistency with login flow

## Flow Diagrams

### Flow 1: First-Time Login (New Session)
```
User submits credentials
↓
signIn('credentials', { redirect: false })
↓
Login succeeds, session created
↓
checkUserStatusAndRedirect() called
↓
Fetches session data
↓
Detects !isActivationPaid
↓
sessionStorage.setItem('activation_email', email) ← EMAIL STORED
↓
router.push('/auth/activate')
↓
Activation page loads
↓
useEffect reads sessionStorage ← EMAIL FOUND
↓
Shows activation form with pre-filled email
```

### Flow 2: Already Has Session (Revisit)
```
User visits /auth/login while logged in
↓
Auth page checks session (server-side)
↓
Detects !isActivationPaid
↓
redirect(`/auth/activate?email=...`) ← EMAIL IN URL
↓
Activation page loads
↓
useEffect reads URL param ← EMAIL FOUND
↓
Shows activation form with pre-filled email
```

### Flow 3: Email Verification
```
User clicks verification link
↓
ConfirmContent verifies token
↓
Stores email in sessionStorage
↓
Stores email in URL: `?email=...` ← EMAIL IN BOTH PLACES
↓
router.push(`/auth/activate?email=...`)
↓
Activation page loads with double-backup email
```

## Testing Checklist

### Test 1: First-Time Unactivated Login
- [ ] Create new account with credentials
- [ ] Verify email
- [ ] Try to login again immediately (WITHOUT activation)
- [ ] Should redirect to activation page
- [ ] Email should be pre-filled in form
- [ ] M-Pesa payment should work
- [ ] After payment, user can login

### Test 2: Delayed Unactivated Login
- [ ] Create new account and verify email
- [ ] Close browser
- [ ] Come back days later
- [ ] Try to login (still unactivated)
- [ ] Should redirect to activation page
- [ ] Email should be pre-filled in form
- [ ] Payment should process

### Test 3: OAuth Unactivated User
- [ ] Login with Google (creates new account)
- [ ] Complete profile
- [ ] Try to continue (still unactivated)
- [ ] Should redirect to activation page
- [ ] Email should be pre-filled
- [ ] M-Pesa payment should work

### Test 4: Already Activated User
- [ ] Complete full flow: signup → verify → activate → approve
- [ ] Try to login
- [ ] Should redirect to dashboard
- [ ] NOT to activation page

### Test 5: URL Fallback
- [ ] Manually navigate to `/auth/activate` (no session, no sessionStorage)
- [ ] Should show "Session Expired"
- [ ] Manual email entry should still work
- [ ] Navigate to `/auth/activate?email=test@example.com`
- [ ] Email should be pre-filled from URL

### Test 6: sessionStorage Persistence
- [ ] Login with unactivated account
- [ ] Activate page loads
- [ ] Refresh page while on activation page
- [ ] Email should still be there (sessionStorage survives refresh)
- [ ] Form should still work

## Error Messages Users Might See

| Message | Reason | Solution |
|---------|--------|----------|
| "Session error. Please try again." | `/api/auth/session` failed | Refresh page and try again |
| "Failed to retrieve session" | Session fetch returned non-200 | Check internet connection |
| "Session Expired" | Can't find email anywhere | Click verification link again |
| "Network error" | API unreachable | Check internet, try again |

## Debug Logging

The code now includes debug logs with `[v0]` prefix:
- Email storage attempts
- Redirect decisions
- User status after login
- Error details

Check browser console (F12 → Console tab) for:
```
[v0] Email stored in sessionStorage: user@example.com
[v0] Credentials user not activated - storing email and redirecting to activate
[v0] User status after login: { email, isActivationPaid, etc }
```

## Backward Compatibility

✓ Fully backward compatible
✓ No database changes
✓ No new API endpoints
✓ No breaking changes
✓ Existing flows continue to work

## Deployment Notes

1. **No Configuration Needed** - Works with existing setup
2. **No New Environment Variables** - All sessionless
3. **Clear Browser Cache** - To ensure new code loads
4. **Monitor Login Flow** - Watch console logs during testing
5. **Test All Auth Methods** - Credentials, Google, Email magic link

## Success Criteria

Users should:
- [ ] Successfully redirect to activation when unactivated
- [ ] See pre-filled email on activation page
- [ ] Complete M-Pesa payment without errors
- [ ] Eventually login after admin approval
- [ ] Not see "Session Expired" error
- [ ] Not be blocked or unable to proceed
