'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { apiFetch } from '../actions'; 

const useQuery = <T,>(endpoint: string, method: 'GET' | 'POST') => ({ data: null as T | null, isLoading: false, error: null as string | null }); 
const useMutation = <TData, TVariables>(endpoint: string, method: 'POST' | 'PUT' | 'DELETE') => ({ mutate: (data: TVariables) => Promise.resolve(), isLoading: false, isError: false, isSuccess: false } as MutationResult<TVariables>); 
type MutationResult<TVariables> = { mutate: (data: TVariables) => Promise<any>; isLoading: boolean; isError: boolean; isSuccess: boolean; }; 

interface User {
  id: string;
  name: string;
  phone: string;
  balance: number;
  referralCode: string;
  totalEarnings: number;
  tasksCompleted: number;
  isVerified: boolean;
  isActive: boolean;
  isApproved: boolean;
  role: 'user' | 'admin' | 'support';
  status: string;
  banReason?: string;
  bannedAt?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  level: number;
  rank: string;
  availableSpins: number;
  lastWithdrawalDate?: string;
  email: string;
}

interface AdminStats {
  totalUsers: number;
  pendingApprovals: number;
  pendingWithdrawals: number;
  totalRevenue: number;
  activeUsers: number;
  totalTransactions: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  phone_number: string;
  referral_id: string;
  role: 'user' | 'admin' | 'support';
  status: 'active' | 'inactive' | 'suspended' | 'banned' | 'pending';
  approval_status: 'pending' | 'approved' | 'rejected';
  level: number;
  rank: string;
  total_earnings_cents: number;
  balance_cents: number;
  tasks_completed: number;
  created_at: string;
  is_verified: boolean;
  is_active: boolean;
  is_approved: boolean;
}

interface WithdrawalRequest {
  id: string;
  user_id: string;
  username: string;
  email: string;
  amount_cents: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  mpesa_number: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  changes: any;
  ip_address: string;
  created_at: string;
}

type SpinData = { userId: string; amount: number };
type ReferralEarningsData = { referrerId: string; referredUserId: string; amount: number };
type SurveyEarningsData = { userId: string; amount: number; surveyId: string };

type ApproveUserData = { userId: string; approvalNotes?: string };
type RejectUserData = { userId: string; rejectionReason: string };
type ProcessWithdrawalData = { withdrawalId: string; action: 'approve' | 'reject'; notes?: string };
type UpdateUserRoleData = { userId: string; role: 'user' | 'admin' | 'support' };
type UpdateUserStatusData = { userId: string; status: 'active' | 'inactive' | 'suspended' | 'banned' };

interface DashboardContextType {
  user: User | null;
  apiFetch: typeof apiFetch; 

  useQuery: typeof useQuery;
  useMutation: typeof useMutation;
  
  spinMutation: MutationResult<SpinData>;
  referralEarningsMutation: MutationResult<ReferralEarningsData>;
  surveyEarningsMutation: MutationResult<SurveyEarningsData>;
  
  approveUserMutation: MutationResult<ApproveUserData>;
  rejectUserMutation: MutationResult<RejectUserData>;
  processWithdrawalMutation: MutationResult<ProcessWithdrawalData>;
  updateUserRoleMutation: MutationResult<UpdateUserRoleData>;
  updateUserStatusMutation: MutationResult<UpdateUserStatusData>;
  
  useAdminStats: () => { data: AdminStats | null; isLoading: boolean; error: string | null };
  useAdminUsers: (filters?: any) => { data: AdminUser[]; isLoading: boolean; error: string | null };
  usePendingApprovals: () => { data: AdminUser[]; isLoading: boolean; error: string | null };
  usePendingWithdrawals: () => { data: WithdrawalRequest[]; isLoading: boolean; error: string | null };
  useAuditLogs: (filters?: any) => { data: AuditLog[]; isLoading: boolean; error: string | null };
  
  isAdmin: boolean;
  isSupport: boolean;
  hasAdminAccess: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const defaultContextValue: Omit<DashboardContextType, 
  'useQuery' | 'useMutation' | 
  'spinMutation' | 'referralEarningsMutation' | 'surveyEarningsMutation' |
  'approveUserMutation' | 'rejectUserMutation' | 'processWithdrawalMutation' |
  'updateUserRoleMutation' | 'updateUserStatusMutation' |
  'useAdminStats' | 'useAdminUsers' | 'usePendingApprovals' | 
  'usePendingWithdrawals' | 'useAuditLogs' |
  'isAdmin' | 'isSupport' | 'hasAdminAccess'
> = {
  user: null,
  apiFetch: apiFetch,
};

export function DashboardProvider({
  children,
  value
}: {
  children: React.ReactNode;
  value?: Omit<DashboardContextType, 
    'useQuery' | 'useMutation' | 
    'spinMutation' | 'referralEarningsMutation' | 'surveyEarningsMutation' |
    'approveUserMutation' | 'rejectUserMutation' | 'processWithdrawalMutation' |
    'updateUserRoleMutation' | 'updateUserStatusMutation' |
    'useAdminStats' | 'useAdminUsers' | 'usePendingApprovals' | 
    'usePendingWithdrawals' | 'useAuditLogs' |
    'isAdmin' | 'isSupport' | 'hasAdminAccess'
  >;
}) {
  const safeValue = value || defaultContextValue;

  const spinMutation = useMutation<any, SpinData>('/api/spin', 'POST');
  const referralEarningsMutation = useMutation<any, ReferralEarningsData>('/api/referral/earnings', 'POST');
  const surveyEarningsMutation = useMutation<any, SurveyEarningsData>('/api/survey/earnings', 'POST');

  const approveUserMutation = useMutation<any, ApproveUserData>('/api/admin/approve-user', 'POST');
  const rejectUserMutation = useMutation<any, RejectUserData>('/api/admin/reject-user', 'POST');
  const processWithdrawalMutation = useMutation<any, ProcessWithdrawalData>('/api/admin/process-withdrawal', 'POST');
  const updateUserRoleMutation = useMutation<any, UpdateUserRoleData>('/api/admin/update-user-role', 'POST');
  const updateUserStatusMutation = useMutation<any, UpdateUserStatusData>('/api/admin/update-user-status', 'POST');

  const useAdminStats = () => {
    const { data, isLoading, error } = useQuery<AdminStats>('/api/admin/stats', 'GET');
    return { data, isLoading, error };
  };

  const useAdminUsers = (filters?: any) => {
    const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    const { data, isLoading, error } = useQuery<AdminUser[]>(`/api/admin/users${queryString}`, 'GET');
    return { data: data || [], isLoading, error };
  };

  const usePendingApprovals = () => {
    const { data, isLoading, error } = useQuery<AdminUser[]>('/api/admin/pending-approvals', 'GET');
    return { data: data || [], isLoading, error };
  };

  const usePendingWithdrawals = () => {
    const { data, isLoading, error } = useQuery<WithdrawalRequest[]>('/api/admin/pending-withdrawals', 'GET');
    return { data: data || [], isLoading, error };
  };

  const useAuditLogs = (filters?: any) => {
    const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    const { data, isLoading, error } = useQuery<AuditLog[]>(`/api/admin/audit-logs${queryString}`, 'GET');
    return { data: data || [], isLoading, error };
  };

  const isAdmin = safeValue.user?.role === 'admin';
  const isSupport = safeValue.user?.role === 'support';
  const hasAdminAccess = isAdmin || isSupport;

  const contextValue: DashboardContextType = useMemo(() => ({
    ...safeValue,
    apiFetch: apiFetch, 
    useQuery: useQuery,
    useMutation: useMutation,
    
    spinMutation: spinMutation,
    referralEarningsMutation: referralEarningsMutation,
    surveyEarningsMutation: surveyEarningsMutation,
    
    approveUserMutation: approveUserMutation,
    rejectUserMutation: rejectUserMutation,
    processWithdrawalMutation: processWithdrawalMutation,
    updateUserRoleMutation: updateUserRoleMutation,
    updateUserStatusMutation: updateUserStatusMutation,
    
    useAdminStats: useAdminStats,
    useAdminUsers: useAdminUsers,
    usePendingApprovals: usePendingApprovals,
    usePendingWithdrawals: usePendingWithdrawals,
    useAuditLogs: useAuditLogs,
    
    isAdmin,
    isSupport,
    hasAdminAccess,
  }), [
    safeValue, apiFetch, 
    spinMutation, referralEarningsMutation, surveyEarningsMutation,
    approveUserMutation, rejectUserMutation, processWithdrawalMutation,
    updateUserRoleMutation, updateUserStatusMutation,
    isAdmin, isSupport, hasAdminAccess
  ]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}

export function useAdmin() {
  const context = useContext(DashboardContext);
  
  if (context === undefined) {
    throw new Error('useAdmin must be used within DashboardProvider');
  }
  
  if (!context.isAdmin && !context.isSupport) {
    throw new Error('Admin access required');
  }
  
  return {
    approveUser: context.approveUserMutation.mutate,
    rejectUser: context.rejectUserMutation.mutate,
    processWithdrawal: context.processWithdrawalMutation.mutate,
    updateUserRole: context.updateUserRoleMutation.mutate,
    updateUserStatus: context.updateUserStatusMutation.mutate,
    
    useAdminStats: context.useAdminStats,
    useAdminUsers: context.useAdminUsers,
    usePendingApprovals: context.usePendingApprovals,
    usePendingWithdrawals: context.usePendingWithdrawals,
    useAuditLogs: context.useAuditLogs,
    
    isAdmin: context.isAdmin,
    isSupport: context.isSupport,
    hasAdminAccess: context.hasAdminAccess,
    
    user: context.user,
    apiFetch: context.apiFetch,
  };
}
