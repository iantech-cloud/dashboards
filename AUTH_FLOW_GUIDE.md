# Signup & Account Activation Flow - FIXED ✅

## Overview
This document describes the corrected signup, email verification, activation payment, and login flow for the HustleHub platform.

---

## Complete Flow Diagram

```
1. USER SIGNUP
   ↓
   User fills signup form with: email, username, phone, password, referral code (optional)
   ↓
   ✅ Account created with status: "pending" / approval_status: "pending"
   ✅ is_verified: false
   ✅ is_active: false
   ✅ is_approved: false
   ↓
   Verification email sent with token link
   
2. EMAIL VERIFICATION
   ↓
   User clicks email verification link in inbox
   Email token validated in /api/auth/verify-email
   ↓
   ✅ User status updated:
      - is_verified: true
      - status: "inactive"
      - email_verified_at: <timestamp>
   ↓
   User redirected to /auth/confirm page
   ↓
   Confirmation page shows success message
   Email stored in sessionStorage for activation page
   ↓
   Redirects to /auth/activate (NO LOGIN REQUIRED)

3. ACCOUNT ACTIVATION (PAYMENT)
   ↓
   Activation page (/auth/activate) loads
   - Can be accessed WITHOUT login session
   - Email read from sessionStorage or URL param
   - Shows activation/payment form
   ↓
   User enters M-Pesa phone number
   ↓
   User submits form
   ↓
   M-Pesa STK push initiated to user's phone
   User sees "Waiting for M-Pesa payment..." page
   ↓
   User enters M-Pesa PIN on phone
   ↓
   ✅ PAYMENT SUCCESSFUL
   ↓
   System queries M-Pesa status API
   ↓
   Status verified - payment_status: "completed"
   ↓
   ✅ User status updated:
      - is_active: true
      - approval_status: "pending" (for admin review)
      - activation_paid_at: <timestamp>
      - rank: <assigned based on activation>
   ↓
   User redirected to /auth/pending-approval page
   Shows "Waiting for Admin Approval" message

4. ADMIN APPROVAL
   ↓
   Admin reviews user in admin panel
   ↓
   ✅ Admin approves user
   ↓
   ✅ User status updated:
      - is_approved: true
      - approval_status: "approved"
      - status: "active"
   ↓
   User notified via email

5. LOGIN (FIRST TIME)
   ↓
   User goes to /auth/login
   ↓
   User enters email and password
   ↓
   ✅ CREDENTIAL VALIDATION:
      - Email found in database
      - Password matches
      - ✅ IMPORTANT: Login succeeds EVEN IF is_verified=false or is_active=false
      - User object returned with authMethod="credentials"
   ↓
   NextAuth creates JWT session with user status fields:
      - is_verified
      - is_active
      - is_approved
      - approval_status
   ↓
   Login page's checkUserStatusAndRedirect() function runs
   ↓
   ✅ SMART REDIRECT LOGIC:
   
      IF NOT is_verified (email not verified):
         → Redirect to /auth/verify-email
         → User verifies email
         → Continue to activation
      
      ELSE IF NOT is_active (activation fee not paid):
         → Redirect to /auth/activate
         → User pays activation fee
         → Continue to admin approval
      
      ELSE IF NOT is_approved (awaiting admin approval):
         → Redirect to /auth/pending-approval
         → Show "Waiting for admin approval" message
         → Wait for admin approval
      
      ELSE (fully approved and active):
         → Redirect to /dashboard
         → User can access platform
   ↓
   User logged in and redirected appropriately

6. SUBSEQUENT LOGINS (AFTER APPROVAL)
   ↓
   User at /auth/login
   ↓
   User enters email and password
   ↓
   ✅ Login succeeds
   ✅ Session created with full user status
   ✅ checkUserStatusAndRedirect() verifies all conditions are met
   ↓
   ✅ ALL CONDITIONS MET:
      - is_verified: true
      - is_active: true
      - is_approved: true
      - status: "active"
   ↓
   Redirect to /dashboard
   ✅ User can access dashboard

7. ACCESSING DASHBOARD WHEN UNACTIVATED
   ↓
   If unactivated user tries to access /dashboard directly:
   ↓
   Dashboard layout component checks user status
   ↓
   IF NOT is_active:
      → Redirect to /auth/activate (NOT /activate)
   ↓
   IF NOT is_approved:
      → Redirect to /auth/pending-approval (NOT /pending-approval)
   ↓
   Unactivated user is properly guided to activation
```

---

## Key Fixes Applied

### 1. ✅ Login Allows All Email-Verified Users
**File:** `auth.ts` (Credentials provider authorize function)
- **Change:** Removed email verification check from login
- **Reason:** Users need to be able to login to complete their activation journey
- **Flow:** Email verification is not required to login, but is checked during session to redirect properly

### 2. ✅ Dashboard Redirects to Correct Activation Path
**File:** `app/dashboard/layout.tsx` (checkUserStatus function)
- **Change:** 
  - Redirect unactivated users to `/auth/activate` (not `/activate`)
  - Redirect unapproved users to `/auth/pending-approval` (not `/pending-approval`)
- **Reason:** These paths align with the app's routing structure under `/auth/`

### 3. ✅ Login Validation Includes Smart Redirect
**File:** `app/auth/login/LoginContent.tsx` (checkUserStatusAndRedirect function)
- **Already implemented correctly:**
  - After successful login, checks all user status fields
  - Redirects unverified users to email verification
  - Redirects unactivated users to activation page
  - Redirects unapproved users to pending approval page
  - Only approved users reach dashboard

### 4. ✅ Email Verification Redirects to Activation
**File:** `app/auth/confirm/ConfirmContent.tsx`
- **Already implemented correctly:**
  - Stores email in sessionStorage for activation page
  - Redirects to `/auth/activate?email=...`
  - No login required

### 5. ✅ Activation Page Works Without Session
**File:** `app/auth/activate/ActivateComponent.tsx`
- **Already implemented correctly:**
  - Reads email from sessionStorage or URL param
  - Works without NextAuth session
  - Calls sessionless M-Pesa APIs
  - Handles payment verification

---

## User Statuses and Meanings

| Field | Values | Meaning |
|-------|--------|---------|
| `is_verified` | true/false | Email address has been verified via link |
| `is_active` | true/false | Activation fee (KES 100) has been paid via M-Pesa |
| `is_approved` | true/false | Admin has reviewed and approved the account |
| `approval_status` | pending, approved, rejected | Current approval stage |
| `status` | pending, inactive, active, suspended, banned | Overall account status |
| `rank` | Unactivated, ... | User's rank/tier in system |
| `activation_paid_at` | timestamp or null | When activation fee was paid |

---

## Important Notes

### 1. Unverified Emails Block Dashboard Access
- Users who haven't verified their email **cannot access the dashboard**
- They will be logged out and redirected to email verification
- This check happens in `dashboard/layout.tsx` → `checkUserStatus()`

### 2. Unactivated Accounts Block Dashboard Access
- Users who haven't paid the activation fee **cannot access the dashboard**
- They will be logged out and redirected to `/auth/activate`
- This is the **primary fix** - users are now properly guided to activation

### 3. Login Allows Unactivated Users
- **Unactivated users CAN login successfully**
- The `checkUserStatusAndRedirect()` function handles routing them appropriately
- This is **intentional** - they need to complete their journey to access platform

### 4. Activation Works Without Login
- Email verification redirects users to activation **without requiring login**
- Activation page can be accessed directly via `/auth/activate?email=...`
- This prevents confusion and allows users to complete payment immediately

### 5. M-Pesa Payment Verification
- After user initiates M-Pesa STK push, system waits for user to enter PIN
- Only after payment is verified does user status update to `is_active: true`
- This prevents premature account activation

---

## Testing Checklist

- [ ] User can signup and receives verification email
- [ ] User can click verification email link
- [ ] After verification, user is redirected to activation page
- [ ] Activation page shows correctly without login session
- [ ] User can enter M-Pesa number and initiate payment
- [ ] User sees "waiting for payment" page
- [ ] After payment success, user status updates to `is_active: true`
- [ ] User is redirected to "Waiting for Admin Approval" page
- [ ] User can login with email/password before activation
- [ ] Unactivated user trying to access dashboard is redirected to activation
- [ ] Admin can approve user in admin panel
- [ ] After admin approval, user can login and access dashboard
- [ ] Subsequent logins work properly and go straight to dashboard

---

## Database Schema Fields Involved

```javascript
Profile Schema:
- is_verified: Boolean (default: false)
- is_active: Boolean (default: false)  
- is_approved: Boolean (default: false)
- approval_status: String (enum: ['pending', 'approved', 'rejected'])
- status: String (enum: ['pending', 'inactive', 'active', 'suspended', 'banned'])
- rank: String (default: 'Unactivated')
- activation_paid_at: Date (nullable)
- email_verified_at: Date (nullable)
```

---

## API Endpoints Involved

| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `/api/auth/register` | User signup | No |
| `/api/auth/verify-email` | Email verification | No |
| `/api/auth/resend-verification` | Resend verification email | No |
| `/api/activate/initiate` | Start M-Pesa STK push | No |
| `/api/activate/status` | Check activation status | No |
| `/api/mpesa/callback` | M-Pesa payment callback | No |
| `/auth/login` | Login page | No (unless redirected) |
| `/dashboard/*` | Dashboard pages | Yes (checks user status) |
| `/admin/*` | Admin pages | Yes (checks admin role) |

---

## Error Handling

### Common Scenarios

**Scenario 1: User tries to login before email verification**
- Login succeeds (email not required for login)
- Session created with `is_verified: false`
- Dashboard layout detects this
- User logged out and redirected to `/auth/verify-email`

**Scenario 2: User tries to access dashboard before payment**
- User logs in (unactivated)
- Login succeeds, session created with `is_active: false`
- Redirect to `/auth/activate` before showing dashboard
- User must pay activation fee

**Scenario 3: User tries to access dashboard before admin approval**
- User logs in after paying activation fee
- Session created with `is_approved: false`
- Redirect to `/auth/pending-approval`
- User waits for admin approval

**Scenario 4: User visits `/auth/activate` after already activated**
- Activation page checks status via `/api/activate/status`
- Detects user is already activated (`activation_paid: true`)
- Shows "Already Activated - Waiting for Approval" message
- Redirects to login if already approved

---

## Configuration Required

### Environment Variables
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Your app URL
- `MPESA_SHORTCODE` - M-Pesa business shortcode
- `MPESA_PASSKEY` - M-Pesa passkey
- `MPESA_CALLBACK_URL` - M-Pesa callback endpoint
- `MPESA_CONSUMER_KEY` - M-Pesa consumer key
- `MPESA_CONSUMER_SECRET` - M-Pesa consumer secret
- `MPESA_ENVIRONMENT` - 'sandbox' or 'production'

### Database
- MongoDB connection string in `MONGODB_URI`
- Profile collection with all mentioned fields

---

## Future Enhancements

- [ ] Add email notifications at each stage
- [ ] Add SMS notifications for M-Pesa payment status
- [ ] Add automated approval workflow (e.g., auto-approve after X days)
- [ ] Add account reactivation for expired accounts
- [ ] Add payment receipt generation and download
- [ ] Add referral bonus after approval

