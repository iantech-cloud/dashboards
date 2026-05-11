# Activation Flow Diagrams

## Complete User Journey Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HUSTLE HUB ACTIVATION SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────────┘

STATE MACHINE:
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Signup     │──────▶│   Verified   │──────▶│  Activated   │
│   (Pending)  │       │   (Inactive) │       │  (Pending)   │
└──────────────┘       └──────────────┘       └──────────────┘
                            │         │
                            │         └──────────────────┐
                            │                            │
                       Can Activate                  Can Activate
                          Now                      On Next Login
                            │                            │
                            ▼                            ▼
                      ┌──────────────────────────────────────────┐
                      │    M-Pesa Payment Initiated              │
                      │    (User enters phone number)            │
                      └──────────────────────────────────────────┘
                                      │
                                      ▼
                      ┌──────────────────────────────────────────┐
                      │    Waiting for Admin Approval            │
                      └──────────────────────────────────────────┘
                                      │
                                      ▼
                      ┌──────────────────────────────────────────┐
                      │    Admin Approved → Active User          │
                      │    Can Now Access Dashboard              │
                      └──────────────────────────────────────────┘
```

---

## Path 1: Email Verification → Immediate Activation (Sessionless)

```
USER SIGNUP FLOW:
═══════════════════════════════════════════════════════════════════════

   User                    Frontend                  Backend
   ═══════════════════════════════════════════════════════════════════

1. Opens signup page
                          /auth/sign-up
                          (empty form)

2. Fills form
   └─ email
   └─ password
   └─ phone

3. Clicks "Sign Up"
                          POST /api/auth/register
                          ├─ hash password (bcrypt)
                          ├─ create Profile
                          │  ├─ is_verified: false
                          │  ├─ approval_status: pending
                          │  ├─ rank: Unactivated
                          │  └─ status: pending
                          ├─ generate token
                          └─ send email
                          
                          Email: "Click to verify"
                          Link: /auth/confirm?token=XXX

4. Receives email
   (checks inbox)

5. Clicks link
                          /auth/confirm?token=XXX
                          ├─ ConfirmContent mounts
                          └─ useEffect calls verify

                          POST /api/auth/verify-email
                          ├─ validate token
                          ├─ token not expired?
                          ├─ user exists?
                          └─ update Profile:
                             ├─ is_verified: true ✓
                             ├─ status: inactive
                             └─ email_verified_at: now()
                          
                          Returns: { user.email }

6. Gets response
                          ConfirmContent:
                          ├─ Extract email from response
                          ├─ sessionStorage.setItem(
                          │  'activation_email',
                          │   user.email
                          │)
                          └─ router.push('/auth/activate')

7. Redirects
                          /auth/activate
                          (page loads)

8. Activation page loads  ActivateComponent mounts:
                          ├─ useEffect triggered
                          ├─ Read sessionStorage:
                          │  sessionStorage.getItem(
                          │   'activation_email'
                          │  )
                          ├─ Email found ✓
                          └─ setEmail(email)

9. Status check          POST /api/activate/status
                         ├─ lookup by email
                         ├─ check is_verified
                         ├─ check activation status
                         └─ returns:
                            {
                              activation_paid: false,
                              approval_status: pending,
                              rank: Unactivated
                            }

10. Form shown
    (ready for phone)
   ├─ Email pre-filled ✓
   └─ Phone number input

11. Enters phone
    └─ 0712345678 or 254712345678

12. Clicks "Pay KSH 1,000"
                          ├─ Validate phone
                          └─ POST /api/activate/initiate
                             ├─ lookup by email
                             ├─ check is_verified
                             ├─ format phone
                             ├─ create ActivationPayment
                             ├─ create ActivationLog
                             └─ initiate M-Pesa STK
                                └─ returns checkoutRequestId

13. M-Pesa Prompt
    (phone screen)
                          ActivateComponent:
                          ├─ Clear sessionStorage
                          │  removeItem('activation_email')
                          └─ router.push(
                             '/auth/activate/mpesa-waiting?...'
                          )

14. Completes payment
    (enters PIN on phone)

15. Payment callback     M-Pesa → /api/mpesa/callback
                         ├─ Verify signature
                         ├─ Update MpesaTransaction
                         ├─ Update ActivationPayment:
                         │  └─ status: completed
                         └─ ADMIN REVIEWS

16. Waits for approval   /auth/activate/mpesa-waiting
                         ├─ Polls payment status
                         └─ Redirects when approved

17. Admin approves       /admin/approvals
                         ├─ Review ActivationPayment
                         └─ Update Profile:
                            ├─ is_active: true ✓
                            ├─ approval_status: approved
                            └─ status: active

18. Can now login        /auth/login
                         ├─ email + password
                         └─ Redirects to /dashboard
```

---

## Path 2: Unactivated User Attempts Login

```
LOGIN FLOW (USER UNACTIVATED):
═══════════════════════════════════════════════════════════════════════

   User                   Frontend                  Backend
   ═══════════════════════════════════════════════════════════════════

1. Opens login page
                         /auth/login
                         (empty form)

2. Fills credentials
   ├─ email: user@ex.com
   └─ password: ****

3. Clicks "Sign In"
                         POST signIn('credentials')
                         (using NextAuth)
                         
                         auth.ts → Credentials provider
                         ├─ lookup by email
                         ├─ check password
                         ├─ check 2FA (if enabled)
                         ├─ validate all
                         └─ return user object:
                            {
                              id: userId,
                              email: user@ex.com,
                              is_verified: true ✓
                              is_active: false ✗
                              isActivationPaid: false
                            }

4. Returns from signIn
                         LoginContent:
                         ├─ result.ok: true
                         └─ Call checkUserStatusAndRedirect()
                            ├─ GET /api/auth/session
                            │  └─ returns user with status
                            └─ user.authMethod: 'credentials'

5. Check credentials
   auth method          if (authMethod === 'credentials')
                        ├─ Check is_verified: true ✓
                        └─ Check isActivationPaid: false
                           └─ FOUND UNACTIVATED USER

6. Before redirect      NEW CODE ADDED:
                        ├─ if (typeof window !== 'undefined') {
                        │  sessionStorage.setItem(
                        │   'activation_email',
                        │   user.email
                        │  ) ✓
                        │ }

7. Redirect            router.push('/auth/activate')
   (with email in
    sessionStorage)    /auth/activate
                       (page loads)

8. Activation loads    ActivateComponent:
                       ├─ useEffect triggered
                       └─ Read sessionStorage:
                          sessionStorage.getItem(
                           'activation_email'
                          ) ← "user@ex.com" ✓

9. Email found
                       ├─ Email pre-filled
                       └─ Phone number input

10. [Same as Path 1]   User completes activation
    Steps 11-17        (see above)

```

---

## Path 3: Return Later Without Activation

```
DELAYED LOGIN FLOW (DAYS/WEEKS LATER):
═══════════════════════════════════════════════════════════════════════

   User                   Frontend                  Backend
   ═══════════════════════════════════════════════════════════════════

1. Days pass...
   (no activation)

2. User tries to login   /auth/login
                         ├─ email: user@ex.com
                         └─ password: ****

3. Login succeeds        ✓ Credentials validated
                         ✓ Session created
   (has session now)

4. Status check          checkUserStatusAndRedirect()
                         ├─ GET /api/auth/session
                         └─ Query returns:
                            {
                              is_verified: true,
                              isActivationPaid: false ✗
                              status: inactive
                            }

5. Still unactivated     REDIRECT TO ACTIVATION
                         ├─ sessionStorage.setItem(
                         │  'activation_email',
                         │  user.email
                         │) ✓
                         └─ router.push('/auth/activate')

6. [Same as Path 2]      Continue with activation
    Steps 8-17           (see above)

```

---

## sessionStorage Data Flow

```
SOURCE → sessionStorage → DESTINATION
══════════════════════════════════════════════════════════════════════

Scenario 1: Email Verification Path
───────────────────────────────────
/api/auth/verify-email
     ↓
     └─ response.user.email
            ↓
            └─ ConfirmContent.tsx
                   ↓
                   └─ sessionStorage.setItem('activation_email', email)
                          ↓
                          └─ /auth/activate
                                 ↓
                                 └─ ActivateComponent
                                        ↓
                                        └─ sessionStorage.getItem('activation_email')
                                               ↓
                                               └─ use in /api/activate/* calls


Scenario 2: Login Path
──────────────────────
checkUserStatusAndRedirect()
     ↓
     └─ session.user.email
            ↓
            └─ LoginContent.tsx
                   ↓
                   └─ sessionStorage.setItem('activation_email', email)
                          ↓
                          └─ /auth/activate
                                 ↓
                                 └─ ActivateComponent
                                        ↓
                                        └─ sessionStorage.getItem('activation_email')
                                               ↓
                                               └─ use in /api/activate/* calls

```

---

## API Call Sequence (Sessionless)

```
ACTIVATION API CALLS:
═══════════════════════════════════════════════════════════════════════

Call 1: Check Status (On Page Load)
────────────────────────────────────
POST /api/activate/status
{
  "email": "user@example.com"
}
           ↓
      [SERVER CHECKS]
      ├─ email exists?
      ├─ is_verified === true? ✓
      ├─ already activated?
      └─ return status

Response:
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


Call 2: Initiate Payment (On Form Submit)
──────────────────────────────────────────
POST /api/activate/initiate
{
  "email": "user@example.com",
  "phoneNumber": "254712345678"
}
           ↓
      [SERVER CHECKS]
      ├─ email exists?
      ├─ is_verified === true? ✓
      ├─ already activated?
      ├─ format phone number
      ├─ create ActivationPayment
      └─ initiate M-Pesa STK Push

Response:
{
  "success": true,
  "data": {
    "checkoutRequestId": "ws_CO_DMZ_xxx",
    "merchantRequestId": "29115-773773-1",
    "amount": 1000,
    "phoneNumber": "254712345678",
    "activationPaymentId": "64a8f...",
    "callbackUrl": "https://api.hustle.../callback"
  }
}
           ↓
      [SHOW M-PESA PROMPT]
```

---

## Data Structure Reference

### Profile Collection
```javascript
{
  _id: ObjectId,
  email: "user@example.com",
  username: "john_doe",
  phone_number: "0712345678",
  
  // Verification Status
  is_verified: true,              // Email verified
  email_verified_at: Date,        // When verified
  
  // Activation Status
  is_active: false,               // Account activated
  approval_status: "pending",     // pending|approved|rejected
  rank: "Unactivated",            // Unactivated|Level1|etc
  status: "inactive",             // pending|inactive|active|suspended
  
  // Activation Payment
  activation_paid_at: null,       // When payment received
  activation_amount_cents: 100000, // 1000 KES
}
```

### ActivationPayment Collection
```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  amount_cents: 100000,
  provider: "mpesa",
  phone_number: "254712345678",
  status: "pending",  // pending|completed|failed|cancelled
  metadata: {
    activation_type: "account_activation",
    initiated_at: Date,
    initiated_without_session: true
  }
}
```

---

## Error Handling Tree

```
┌─ Activation Page Load
│  ├─ Email missing?
│  │  └─ Show: "Session Expired" 
│  │     Action: Go to Login
│  │
│  ├─ /api/activate/status fails?
│  │  └─ Show: "Failed to load status"
│  │     Action: Retry
│  │
│  └─ Already paid?
│     └─ Show: "Payment Received"
│        Action: Go to Login or Waiting Page
│
├─ Phone Validation
│  ├─ Invalid format?
│  │  └─ Show: "Invalid phone (use 07XX or 254)"
│  │     Action: Fix & retry
│  │
│  └─ Valid? → Continue
│
├─ Payment Initiation
│  ├─ /api/activate/initiate fails?
│  │  └─ Show: Error message
│  │     Action: Contact support
│  │
│  ├─ M-Pesa API error?
│  │  └─ Show: M-Pesa error
│  │     Action: Try again
│  │
│  └─ Success → M-Pesa Prompt
│
└─ M-Pesa Payment
   ├─ User cancels?
   │  └─ Show: "Cancelled"
   │     Action: Try again
   │
   ├─ Timeout?
   │  └─ Show: "Timeout"
   │     Action: Check account & retry
   │
   └─ Completed? → Admin approval
```

---

## Security Checkpoints

```
✓ Email Verification Requirement
  └─ All APIs check: is_verified === true
     Prevents: Bypassing email verification

✓ Activation Status Validation
  └─ Check: approval_status !== 'pending' OR rank !== 'Unactivated'
     Prevents: Double activation

✓ Phone Number Validation
  └─ Format: Must be 07XXXXXXXX or 254XXXXXXXXX
     Prevents: Invalid M-Pesa requests

✓ User Existence Check
  └─ Email lookup: Verify user exists
     Prevents: Creating phantom payments

✓ sessionStorage Security
  └─ Only contains: email (non-sensitive)
     Prevents: Exposing passwords, tokens

✓ M-Pesa Signature Verification
  └─ Validate callback signature
     Prevents: Spoofed payment callbacks
```

