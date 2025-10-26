// app/admin/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Menu, 
  X, 
  Home, 
  LayoutGrid, 
  FileText, 
  BarChart3, 
  CheckSquare,
  Users, 
  UserCheck, 
  ArrowDownUp, 
  CreditCard, 
  PieChart,
  FileSearch,
  LogOut,
  ChevronLeft
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: any; // User data passed from server component
}

export default function AdminLayout({ children, user }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [router]);

  // Navigation items with icons
  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/actions', label: 'Actions', icon: LayoutGrid },
    { href: '/admin/spin-management', label: 'Spin Management', icon: BarChart3 },
    { href: '/admin/blogs', label: 'Blog Management', icon: FileText },
    { href: '/admin/surveys', label: 'Surveys Management', icon: CheckSquare },
    { href: '/admin/user-content', label: 'Content Submissions', icon: FileSearch },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/approvals', label: 'Pending Approvals', icon: UserCheck },
    { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowDownUp },
    { href: '/admin/transactions', label: 'Transactions', icon: CreditCard },
    { href: '/admin/reports', label: 'Financial Reports', icon: PieChart },
    { href: '/admin/audit-logs', label: 'Audit Logs', icon: FileSearch },
  ];

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-sm z-30 border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Admin</h1>
          <div className="w-10"></div> {/* Spacer for balance */}
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Responsive for both mobile and desktop */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-indigo-700">
                Admin Dashboard
              </h1>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <span>Welcome, 
                <strong className="text-gray-800 ml-1">
                  {user?.username || user?.email}
                </strong>
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center p-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150 group"
                  >
                    <Icon size={20} className="mr-3 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </a>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <a 
              href="/admin" 
              className="flex items-center justify-center p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition duration-150"
            >
              <ChevronLeft size={16} className="mr-2" />
              Back to Dashboard
            </a>
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition duration-150"
            >
              <LogOut size={16} className="mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-8 mt-16 lg:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
