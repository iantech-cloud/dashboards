# Database Migration Guide

## Running the Migration

### Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `migration.sql`
4. Paste and run in the SQL Editor

### Using psql Command Line
```bash
psql $POSTGRES_URL < database/migration.sql
```

### Using the Seed API Route (Development Only)
The app includes a seed route at `/api/seed` that can be used in development.

## Post-Migration Steps

### 1. Create Your First Admin User
After running the migration, you need to promote a user to admin:

1. Register a new account through the app
2. Verify the email
3. Run this SQL command (replace with your admin email):

```sql
UPDATE profiles 
SET 
  role = 'admin', 
  approval_status = 'approved', 
  is_approved = TRUE, 
  is_verified = TRUE,
  activation_paid_at = NOW()
WHERE email = 'your-admin@email.com';
```

### 2. Refresh Dashboard Stats
The admin dashboard uses a materialized view for performance. Refresh it with:

```sql
SELECT refresh_admin_dashboard_stats();
```

You can set up a cron job to refresh this periodically.

## Table Structure

### Core Tables
- **profiles** - User profiles with role, verification, and approval status
- **activation_payments** - KSH 1000 activation fee tracking
- **support_tickets** - Customer support ticket system
- **admin_audit_logs** - Admin action audit trail

### Supporting Tables
- **referrals** - User referral tracking
- **downline_users** - Multi-level referral structure
- **earnings** - All user earnings (referrals, tasks, bonuses)
- **withdrawals** - Withdrawal requests and approvals
- **transactions** - Transaction history

## User Roles

1. **user** - Standard user with dashboard access
2. **support** - Support team member with ticket management
3. **admin** - Full system access with approval powers

## Approval Workflow

1. User registers → `approval_status = 'pending'`
2. User verifies email → `email_verified_at` set
3. User pays KSH 1000 → `activation_paid_at` set
4. Admin approves → `approval_status = 'approved'`, `is_approved = TRUE`
5. User can now login and access dashboard
