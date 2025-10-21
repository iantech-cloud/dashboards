// app/admin/layout.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase, Profile } from '../lib/models';
import React from 'react';

// Define the shape of the component's props
interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  // 🔒 Authentication Check: Ensure a user session exists
  if (!session?.user?.email) {
    redirect('/auth/login');
  }

  try {
    // 💾 Database Connection: Fetch the full user profile
    await connectToDatabase();
    const user = await Profile.findOne({ email: session.user.email });

    // ⛔ User Existence Check
    if (!user) {
      redirect('/auth/login');
    }

    // 🔑 Authorization Check: Must have the 'admin' role
    if (user.role !== 'admin') {
      redirect('/'); // Redirect non-admins to the home page
    }

    // ✅ Account Status Check: Must be 'approved' and 'active'
    // FIX: Check both is_active AND status fields
    if (user.approval_status !== 'approved' || !user.is_active || user.status !== 'active') {
      redirect('/dashboard');
    }

    // If all security checks pass, render the layout and content
    return (
      <div className="admin-layout flex h-screen bg-gray-50">
        
        {/* Admin Navigation Sidebar */}
        <nav className="admin-nav w-64 p-4 bg-white shadow-xl flex flex-col justify-between">
          <div className="nav-content">
            <div className="nav-header mb-8 pb-4 border-b">
              <h1 className="text-xl font-bold text-indigo-700">
                Admin Dashboard
              </h1>
              <div className="user-info mt-2 text-sm text-gray-600">
                <span>Welcome, 
                  <strong className="text-gray-800 ml-1">
                    {user.username || user.email}
                  </strong>
                </span>
              </div>
            </div>

            {/* Navigation Menu with Icons */}
            <div className="admin-nav-menu space-y-2">
              <a href="/admin" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Dashboard
              </a>
              
              {/* Spin Management - NEW */}
              <a href="/admin/spin-management" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"></path>
                </svg>
                Spin Management
              </a>
              
              {/* Blog Management */}
              <a href="/admin/blogs" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
                Blog Management
              </a>
              
              {/* Surveys Management */}
              <a href="/admin/surveys" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                  <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M16 8h6"></path>
                  <path d="M19 5v6"></path>
                </svg>
                Surveys Management
              </a>
              
              {/* User Content Submissions */}
              <a href="/admin/user-content" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <path d="M9 12l2 2 4-4m7 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
                  <path d="M9 10H9.01M15 10H15.01"></path>
                </svg>
                Content Submissions
              </a>
              
              <a href="/admin/users" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                User Management
              </a>
              
              <a href="/admin/approvals" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                Pending Approvals
              </a>
              
              <a href="/admin/withdrawals" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <polyline points="19 12 12 19 5 12"></polyline>
                  <line x1="5" y1="21" x2="19" y2="21"></line>
                </svg>
                Withdrawals
              </a>
              
              <a href="/admin/transactions" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Transactions
              </a>
              
              <a href="/admin/audit-logs" className="nav-item flex items-center p-2 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition duration-150">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                  <polyline points="13 2 13 9 20 9"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Audit Logs
              </a>
            </div>
          </div>

          {/* Sign Out Section */}
          <div className="mt-8 pt-4 border-t">
            <a 
              href="/admin" 
              className="block w-full text-center p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition duration-150 mb-2"
            >
              Back to Dashboard
            </a>
            <form action="/api/auth/signout" method="POST">
              <button 
                type="submit" 
                className="signout-btn w-full flex items-center justify-center p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition duration-150"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Sign Out
              </button>
            </form>
          </div>
        </nav>
        
        {/* Main Content Area */}
        <main className="admin-main flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    );
  } catch (error) {
    // 💥 Error Handling: Catch database or server-related errors
    console.error('Admin layout error:', error);
    // Redirect to a safe page instead of throwing
    redirect('/dashboard');
  }
}
