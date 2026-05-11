# Activation Flow Testing Guide

## Prerequisites
- MongoDB connection
- M-Pesa sandbox credentials configured
- Access to admin dashboard

## Test Scenario 1: Full Activation Flow (Happy Path)

### Step 1: Create Unverified User
```bash
# User signs up with email and password
# Check database
db.profiles.findOne({ email: "test@example.com" })

# Expected output:
{
  "_id": ObjectId("..."),
  "email": "test@example.com",
  "is_verified": false,
  "email_verified_at": null,
  "is_active": false,
  "is_approved": false,
  "activation_paid_at": null,
  "approval_status": "pending",
  "rank": "Unactivated",
  "status": "pending"
}
```

### Step 2: Verify Email
```bash
# Simulate email verification
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "verification_token_from_email"}'

# Check database again
db.profiles.findOne({ email: "test@example.com" })

# Expected changes:
{
  "is_verified": true,  # CHANGED
  "email_verified_at": ISODate("2024-05-11T12:00:00.000Z"),  # SET
  "is_active": false,
  "is_approved": false,
  "activation_paid_at": null
}
```

### Step 3: User Can Now Login
```bash
# Login with verified user
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Expected session:
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "test@example.com",
    "is_verified": true,        # TRUE
    "is_active": false,         # FALSE - redirect to /auth/activate
    "is_approved": false,
    "isActivationPaid": false
  }
}

# Dashboard redirects to /auth/activate
```

### Step 4: Initiate M-Pesa Payment
```bash
# User submits phone number on /auth/activate
curl -X POST http://localhost:3000/api/activate/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phoneNumber": "254712345678"
  }'

# Expected response:
{
  "success": true,
  "data": {
    "checkoutRequestId": "ws_CO_01MAY231000000123",
    "amount": 10000,
    "phoneNumber": "254712345678",
    "activationPaymentId": "507f1f77bcf86cd799439020"
  }
}

# Check M-Pesa transaction record created
db.mpesatransactions.findOne({ checkout_request_id: "ws_CO_01MAY231000000123" })

# Expected:
{
  "_id": ObjectId("507f1f77bcf86cd799439020"),
  "checkout_request_id": "ws_CO_01MAY231000000123",
  "email": "test@example.com",
  "amount_cents": 10000,
  "status": "initiated",
  "result_code": null,
  "result_desc": null,
  "is_activation_payment": true,
  "completed_at": null,
  "failed_at": null,
  "created_at": ISODate("2024-05-11T12:05:00.000Z")
}
```

### Step 5: Simulate M-Pesa Callback (for testing)
```bash
# In real scenario, M-Pesa sends callback automatically
# For testing, manually update the transaction
db.mpesatransactions.updateOne(
  { checkout_request_id: "ws_CO_01MAY231000000123" },
  {
    $set: {
      "status": "completed",
      "result_code": 0,
      "result_desc": "The service request has been processed successfully.",
      "mpesa_receipt_number": "QBL61H83ZX",
      "completed_at": ISODate("2024-05-11T12:06:00.000Z")
    }
  }
)

# Also update profile with activation payment
db.profiles.updateOne(
  { email: "test@example.com" },
  {
    $set: {
      "activation_paid_at": ISODate("2024-05-11T12:06:00.000Z"),
      "is_active": false,  # Still false - awaiting admin approval
      "is_approved": false,
      "approval_status": "pending"
    }
  }
)
```

### Step 6: Check Payment Status (Frontend Polling)
```bash
# Frontend polls this every 4 seconds
curl -X POST http://localhost:3000/api/activate/status \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Expected response (after payment):
{
  "success": true,
  "data": {
    "activation_paid": true,
    "is_approved": false,
    "approval_status": "pending",
    "mpesa_receipt": "QBL61H83ZX"
  }
}
```

### Step 7: User Logs In Again (After Payment)
```bash
# User logs in after payment notification
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Expected session (CHANGED):
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "test@example.com",
    "is_verified": true,
    "is_active": false,         # Still FALSE
    "is_approved": false,       # Still FALSE
    "isActivationPaid": true    # CHANGED to TRUE
  }
}

# Dashboard redirects to /auth/pending-approval
```

### Step 8: Admin Approves User
```bash
# Admin logs in and approves user
curl -X POST http://localhost:3000/api/admin/approve-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token" \
  -d '{"userId": "507f1f77bcf86cd799439011"}'

# Expected database changes:
db.profiles.findOne({ email: "test@example.com" })

{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "email": "test@example.com",
  "is_verified": true,
  "email_verified_at": ISODate("2024-05-11T12:00:00.000Z"),
  "is_active": true,              # CHANGED to true
  "is_approved": true,            # CHANGED to true
  "activation_paid_at": ISODate("2024-05-11T12:06:00.000Z"),
  "approval_status": "approved",  # CHANGED
  "approval_by": ObjectId("admin_id"),
  "approval_at": ISODate("2024-05-11T12:10:00.000Z"),
  "rank": "Active",               # Updated by admin
  "status": "active"              # CHANGED
}
```

### Step 9: User Logs In to Dashboard
```bash
# User logs in
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Expected session (FULLY ACTIVATED):
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "test@example.com",
    "name": "testuser",
    "is_verified": true,        # ✅
    "is_active": true,          # ✅
    "is_approved": true,        # ✅
    "isActivationPaid": true,   # ✅
    "approval_status": "approved",
    "rank": "Active",
    "status": "active"
  },
  "dashboardRoute": "/dashboard"
}

# No redirects - User lands on dashboard
```

---

## Test Scenario 2: Payment Failure

### After M-Pesa Decline
```bash
# M-Pesa sends error callback or query shows failed status
db.mpesatransactions.updateOne(
  { checkout_request_id: "ws_CO_01MAY231000000123" },
  {
    $set: {
      "status": "failed",
      "result_code": 1,
      "result_desc": "Insufficient balance.",
      "failed_at": ISODate("2024-05-11T12:06:30.000Z")
    }
  }
)

# Profile NOT updated - activation_paid_at remains null

# Check status
curl -X POST http://localhost:3000/api/activate/status \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Expected response:
{
  "success": true,
  "data": {
    "activation_paid": false,  # Payment failed
    "error": "Insufficient balance."
  }
}

# User can try again
```

---

## Database Verification Checklist

### After Step 2 (Email Verified)
- [ ] `is_verified = true`
- [ ] `email_verified_at` is set
- [ ] `activation_paid_at` is null
- [ ] `is_active = false`
- [ ] `is_approved = false`

### After Step 5 (Payment Completed)
- [ ] M-Pesa transaction `status = "completed"`
- [ ] M-Pesa transaction `mpesa_receipt_number` is set
- [ ] M-Pesa transaction `result_code = 0`
- [ ] Profile `activation_paid_at` is set
- [ ] Profile `is_active` still false
- [ ] Profile `is_approved` still false

### After Step 8 (Admin Approval)
- [ ] Profile `is_active = true`
- [ ] Profile `is_approved = true`
- [ ] Profile `approval_status = "approved"`
- [ ] Profile `approval_by` is set to admin ID
- [ ] Profile `approval_at` is set
- [ ] Profile `rank = "Active"` (or similar)
- [ ] Profile `status = "active"`

---

## Session State Transitions

```
State 1: Unverified
├─ Session: Can't login
└─ DB: is_verified=false

State 2: Verified
├─ Session: Can login, redirected to /auth/activate
├─ DB: is_verified=true, activation_paid_at=null, is_active=false
└─ Next: User makes payment

State 3: Payment Received
├─ Session: Can login, redirected to /auth/pending-approval
├─ DB: is_verified=true, activation_paid_at=NOW(), is_approved=false
└─ Next: Admin approves

State 4: Approved
├─ Session: Can login, redirected to dashboard
├─ DB: is_verified=true, is_active=true, is_approved=true
└─ Next: Full dashboard access
```

---

## Quick MongoDB Queries

```javascript
// See user at each stage
db.profiles.findOne({ email: "test@example.com" })

// See M-Pesa transactions
db.mpesatransactions.find({ email: "test@example.com" }).pretty()

// Check activation payments
db.mpesatransactions.find({ is_activation_payment: true }).pretty()

// Reset user to unverified (testing)
db.profiles.updateOne(
  { email: "test@example.com" },
  {
    $set: {
      "is_verified": false,
      "email_verified_at": null,
      "is_active": false,
      "is_approved": false,
      "activation_paid_at": null
    }
  }
)

// Approve a user immediately
db.profiles.updateOne(
  { email: "test@example.com" },
  {
    $set: {
      "is_active": true,
      "is_approved": true,
      "approval_status": "approved",
      "status": "active",
      "rank": "Active",
      "approval_at": new Date()
    }
  }
)
```
