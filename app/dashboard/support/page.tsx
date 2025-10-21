import { Suspense } from 'react';
import { createClient } from '@/app/lib/supabase-server';
import { fetchSupportDashboardData } from '@/app/lib/data';
import { redirect } from 'next/navigation';
import { 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Users,
  TrendingUp,
  XCircle
} from 'lucide-react';

async function getSupportData() {
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

  if (!profile || profile.role !== 'support' || !profile.is_approved) {
    redirect('/dashboard');
  }

  const dashboardData = await fetchSupportDashboardData(user.id);
  return { dashboardData, userId: user.id };
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'indigo' 
}: { 
  title: string; 
  value: number | string; 
  icon: any; 
  color?: string 
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
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.indigo}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: any }) {
  const priorityColors = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-blue-100 text-blue-800',
  };

  const statusColors = {
    open: 'bg-green-100 text-green-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-purple-100 text-purple-800',
    closed: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">{ticket.subject}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full font-medium ${priorityColors[ticket.priority as keyof typeof priorityColors]}`}>
            {ticket.priority.toUpperCase()}
          </span>
          <span className={`px-2 py-1 rounded-full font-medium ${statusColors[ticket.status as keyof typeof statusColors]}`}>
            {ticket.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className="text-gray-500">
          <p>{ticket.user_name || ticket.user_email}</p>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Created: {new Date(ticket.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}

export default async function SupportDashboardPage() {
  const { dashboardData } = await getSupportData();
  const stats = dashboardData.stats || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Support Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage and track support tickets</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard 
            title="My Tickets" 
            value={stats.my_tickets || 0} 
            icon={Users} 
            color="indigo" 
          />
          <StatCard 
            title="Open Tickets" 
            value={stats.open_tickets || 0} 
            icon={Ticket} 
            color="green" 
          />
          <StatCard 
            title="In Progress" 
            value={stats.in_progress_tickets || 0} 
            icon={Clock} 
            color="blue" 
          />
          <StatCard 
            title="Urgent" 
            value={stats.urgent_tickets || 0} 
            icon={AlertTriangle} 
            color="red" 
          />
          <StatCard 
            title="Resolved" 
            value={stats.resolved_tickets || 0} 
            icon={CheckCircle} 
            color="purple" 
          />
          <StatCard 
            title="Closed" 
            value={stats.closed_tickets || 0} 
            icon={XCircle} 
            color="yellow" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">My Assigned Tickets</h2>
            <div className="space-y-4">
              {dashboardData.myTickets && dashboardData.myTickets.length > 0 ? (
                dashboardData.myTickets.map((ticket: any) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No tickets assigned to you</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Unassigned Tickets</h2>
            <div className="space-y-4">
              {dashboardData.unassignedTickets && dashboardData.unassignedTickets.length > 0 ? (
                dashboardData.unassignedTickets.map((ticket: any) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No unassigned tickets</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
