import { Suspense } from 'react';
import { createClient } from '@/app/lib/supabase-server';
import { fetchAdminDashboardData } from '@/app/lib/data';
import { redirect } from 'next/navigation';
import ApprovalActions from './ApprovalActions';
import { 
  Users, 
  DollarSign, 
  UserCheck, 
  TrendingUp,
  Clock,
  Shield,
  Ticket,
  CreditCard
} from 'lucide-react';

async function getAdminData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_approved, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || !profile.is_approved) {
    redirect('/dashboard');
  }

  const dashboardData = await fetchAdminDashboardData();
  return { dashboardData, adminId: user.id };
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'indigo',
  subtitle 
}: { 
  title: string; 
  value: number | string; 
  icon: any; 
  color?: string;
  subtitle?: string;
}) {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.indigo}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function PendingApprovalCard({ approval }: { approval: any }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800">{approval.username}</h3>
          <p className="text-sm text-gray-600">{approval.email}</p>
          {approval.phone_number && (
            <p className="text-sm text-gray-500">{approval.phone_number}</p>
          )}
        </div>
        <div className="text-right">
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            Pending
          </span>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-3 mb-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Payment:</span>
          <span className="font-medium text-green-600">
            KSh {approval.amount?.toFixed(2) || '0.00'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Provider:</span>
          <span className="font-medium">{approval.provider || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Reference:</span>
          <span className="font-medium">{approval.provider_reference || 'N/A'}</span>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        <p>Registered: {new Date(approval.created_at).toLocaleDateString()}</p>
        {approval.paid_at && (
          <p>Paid: {new Date(approval.paid_at).toLocaleDateString()}</p>
        )}
      </div>

      <ApprovalActions userId={approval.id} />
    </div>
  );
}

function PaymentCard({ payment }: { payment: any }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-semibold text-gray-800">{payment.username}</p>
          <p className="text-xs text-gray-600">{payment.email}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-600">KSh {payment.amount?.toFixed(2)}</p>
          <span className={`text-xs px-2 py-1 rounded-full ${
            payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {payment.status}
          </span>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        {new Date(payment.created_at).toLocaleString()}
      </div>
    </div>
  );
}

function AuditLogCard({ log }: { log: any }) {
  const actionColors: Record<string, string> = {
    approve_user: 'bg-green-100 text-green-800',
    reject_user: 'bg-red-100 text-red-800',
    ban_user: 'bg-red-100 text-red-800',
    suspend_user: 'bg-yellow-100 text-yellow-800',
    update_role: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-800'}`}>
            {log.action.replace('_', ' ').toUpperCase()}
          </span>
          <p className="text-sm text-gray-700 mt-2">
            by <span className="font-medium">{log.actor_name}</span>
          </p>
        </div>
        <p className="text-xs text-gray-500">
          {new Date(log.created_at).toLocaleString()}
        </p>
      </div>
      <div className="text-xs text-gray-600">
        Target: {log.target_type} ({log.target_id.substring(0, 8)}...)
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { dashboardData, adminId } = await getAdminData();
  const stats = dashboardData.stats || {} as any;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Platform management and oversight</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Pending Approvals" 
            value={stats.pending_approvals || 0} 
            icon={Clock} 
            color="yellow" 
          />
          <StatCard 
            title="Active Users" 
            value={stats.active_users || 0} 
            icon={Users} 
            color="green" 
          />
          <StatCard 
            title="Total Revenue" 
            value={`KSh ${(stats.total_revenue || 0).toLocaleString()}`} 
            icon={DollarSign} 
            color="indigo" 
            subtitle={`${stats.payments_today || 0} payments today`}
          />
          <StatCard 
            title="Open Tickets" 
            value={stats.open_tickets || 0} 
            icon={Ticket} 
            color="red" 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="New Users (24h)" 
            value={stats.new_users_today || 0} 
            icon={UserCheck} 
            color="blue" 
          />
          <StatCard 
            title="New Users (7d)" 
            value={stats.new_users_week || 0} 
            icon={TrendingUp} 
            color="purple" 
          />
          <StatCard 
            title="Support Team" 
            value={stats.support_team_count || 0} 
            icon={Shield} 
            color="indigo" 
          />
          <StatCard 
            title="Payments (24h)" 
            value={stats.payments_today || 0} 
            icon={CreditCard} 
            color="green" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Pending Approvals</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {dashboardData.pendingApprovals && dashboardData.pendingApprovals.length > 0 ? (
                dashboardData.pendingApprovals.map((approval: any) => (
                  <PendingApprovalCard 
                    key={approval.id} 
                    approval={approval}
                  />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No pending approvals</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Payments (7 days)</h2>
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {dashboardData.recentPayments && dashboardData.recentPayments.length > 0 ? (
                  dashboardData.recentPayments.map((payment: any) => (
                    <PaymentCard key={payment.id} payment={payment} />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No recent payments</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Audit Logs</h2>
              <div className="space-y-3 max-h-[280px] overflow-y-auto">
                {dashboardData.auditLogs && dashboardData.auditLogs.length > 0 ? (
                  dashboardData.auditLogs.map((log: any) => (
                    <AuditLogCard key={log.id} log={log} />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No audit logs</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
