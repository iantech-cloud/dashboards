// app/admin/withdrawals/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { 
  getWithdrawals, 
  getWithdrawalStats,
  approveWithdrawal,
  rejectWithdrawal,
  completeWithdrawal,
  reverseWithdrawal,
  bulkApproveWithdrawals
} from '@/actions/withdrawals';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw,
  Eye
} from 'lucide-react';

interface Withdrawal {
  _id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
    phone: string;
    balance: number;
  };
  amount: number;
  amountCents: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  mpesaNumber: string;
  transactionCode?: string;
  mpesaReceiptNumber?: string;
  approvedBy?: {
    id: string;
    username: string;
    email: string;
  };
  approvedAt?: string;
  processedAt?: string;
  processingNotes?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface WithdrawalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  totalAmountCents: number;
  averageAmountCents: number;
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedWithdrawals, setSelectedWithdrawals] = useState<string[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [modalInput, setModalInput] = useState('');

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      
      const filters: any = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }
      if (dateFilter !== 'all') {
        const now = new Date();
        if (dateFilter === 'today') {
          filters.startDate = new Date(now.setHours(0, 0, 0, 0));
        } else if (dateFilter === 'week')
