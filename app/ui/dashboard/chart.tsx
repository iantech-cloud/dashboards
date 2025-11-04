'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  date: string;
  transaction_code: string;
}

interface TransactionData {
  transactions: Transaction[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
    limit: number;
  };
}

interface ChartProps {
  timeRange?: '7days' | '30days' | '90days' | '1year';
}

export default function TransactionTrendsChart({ timeRange = '30days' }: ChartProps) {
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'doughnut'>('bar');

  // Calculate date ranges
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    const fetchTransactionData = async () => {
      try {
        setLoading(true);
        const { startDate, endDate } = getDateRange();
        
        const response = await fetch(
          `/api/transactions?startDate=${startDate}&endDate=${endDate}&limit=1000`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch transactions');
        }
        
        const data = await response.json();
        if (data.success) {
          setTransactionData(data.data);
        } else {
          throw new Error(data.message || 'Failed to fetch transactions');
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionData();
  }, [timeRange]);

  // Process data for charts
  const processChartData = () => {
    if (!transactionData?.transactions.length) return null;

    const transactions = transactionData.transactions;
    
    // Filter only completed transactions for trend analysis
    const completedTransactions = transactions.filter(tx => tx.status === 'completed');
    
    if (completedTransactions.length === 0) return null;

    // Group by date for line/bar charts
    const transactionsByDate: { [key: string]: number } = {};
    const typeTotals: { [key: string]: number } = {};
    
    completedTransactions.forEach(transaction => {
      const date = new Date(transaction.date).toLocaleDateString();
      transactionsByDate[date] = (transactionsByDate[date] || 0) + transaction.amount;
      
      // Sum by type
      typeTotals[transaction.type] = (typeTotals[transaction.type] || 0) + transaction.amount;
    });

    // Prepare data for bar/line charts
    const dates = Object.keys(transactionsByDate).sort();
    const amounts = dates.map(date => transactionsByDate[date]);

    // Prepare data for doughnut chart
    const typeLabels = Object.keys(typeTotals);
    const typeAmounts = typeLabels.map(type => typeTotals[type]);
    
    const backgroundColors = [
      'rgba(34, 197, 94, 0.8)',  // Green - SPIN_WINS
      'rgba(59, 130, 246, 0.8)', // Blue - REFERRALS
      'rgba(249, 115, 22, 0.8)', // Orange - SURVEYS
      'rgba(139, 92, 246, 0.8)', // Purple - DEPOSITS
      'rgba(239, 68, 68, 0.8)',  // Red - WITHDRAWALS
      'rgba(234, 179, 8, 0.8)',  // Yellow - BONUS
      'rgba(6, 182, 212, 0.8)',  // Cyan - TASK_PAYMENT
    ];

    const borderColors = backgroundColors.map(color => color.replace('0.8', '1'));

    const commonData = {
      labels: dates,
      datasets: [
        {
          label: 'Transaction Amount (KES)',
          data: amounts,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          tension: 0.1,
        },
      ],
    };

    const doughnutData = {
      labels: typeLabels,
      datasets: [
        {
          data: typeAmounts,
          backgroundColor: backgroundColors.slice(0, typeLabels.length),
          borderColor: borderColors.slice(0, typeLabels.length),
          borderWidth: 2,
        },
      ],
    };

    return { commonData, doughnutData, typeTotals };
  };

  const chartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `Transaction Trends - Last ${timeRange}`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return 'KES ' + value;
          },
        },
      },
    },
  };

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const processedData = processChartData();

  // Calculate totals for summary cards
  const calculateTotals = () => {
    if (!transactionData?.transactions.length) {
      return {
        spinWinTotal: 0,
        referralTotal: 0,
        surveyTotal: 0,
        totalEarnings: 0,
      };
    }

    const completedTransactions = transactionData.transactions.filter(tx => tx.status === 'completed');
    
    const spinWinTotal = completedTransactions
      .filter(tx => tx.type === 'SPIN_WIN' || tx.type === 'SPIN_PRIZE')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const referralTotal = completedTransactions
      .filter(tx => tx.type === 'REFERRAL')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const surveyTotal = completedTransactions
      .filter(tx => tx.type === 'SURVEY')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalEarnings = completedTransactions
      .filter(tx => 
        ['SPIN_WIN', 'SPIN_PRIZE', 'REFERRAL', 'SURVEY', 'BONUS', 'TASK_PAYMENT'].includes(tx.type)
      )
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      spinWinTotal,
      referralTotal,
      surveyTotal,
      totalEarnings,
    };
  };

  const { spinWinTotal, referralTotal, surveyTotal, totalEarnings } = calculateTotals();
  const chartLabels = transactionData?.transactions?.map(tx => tx.date) || [];

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Transaction Trends</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading transaction data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Transaction Trends</h3>
        <div className="text-center text-red-600 py-8">
          <p>Error loading chart data: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">Transaction Trends</h3>
        
        <div className="flex flex-wrap gap-4">
          {/* Time Range Selector */}
          <select 
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={timeRange}
            onChange={(e) => window.location.href = `?timeRange=${e.target.value}`}
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>

          {/* Chart Type Selector */}
          <select 
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'bar' | 'line' | 'doughnut')}
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="doughnut">Doughnut Chart</option>
          </select>
        </div>
      </div>

      {chartLabels.length > 0 && processedData ? (
        <div className="space-y-6">
          {/* Chart Visualization */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="h-80">
              {chartType === 'bar' && processedData.commonData && (
                <Bar
                  ref={chartRef}
                  data={processedData.commonData}
                  options={chartOptions}
                />
              )}
              {chartType === 'line' && processedData.commonData && (
                <Line
                  ref={chartRef}
                  data={processedData.commonData}
                  options={chartOptions}
                />
              )}
              {chartType === 'doughnut' && processedData.doughnutData && (
                <Doughnut
                  data={processedData.doughnutData}
                  options={doughnutOptions}
                />
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-100 p-4 rounded-lg border border-green-200">
              <div className="font-semibold text-green-800 text-sm">SPIN WINS</div>
              <div className="text-green-600 font-bold text-lg">KES {spinWinTotal.toFixed(2)}</div>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="font-semibold text-blue-800 text-sm">REFERRALS</div>
              <div className="text-blue-600 font-bold text-lg">KES {referralTotal.toFixed(2)}</div>
            </div>
            <div className="bg-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="font-semibold text-orange-800 text-sm">SURVEYS</div>
              <div className="text-orange-600 font-bold text-lg">KES {surveyTotal.toFixed(2)}</div>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="font-semibold text-purple-800 text-sm">TOTAL EARNINGS</div>
              <div className="text-purple-600 font-bold text-lg">KES {totalEarnings.toFixed(2)}</div>
            </div>
          </div>

          {/* Transaction Stats */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-3">Transaction Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Total Transactions</div>
                <div className="font-bold text-gray-800">{transactionData?.pagination.totalCount || 0}</div>
              </div>
              <div>
                <div className="text-gray-600">Completed</div>
                <div className="font-bold text-green-600">
                  {transactionData?.transactions.filter(tx => tx.status === 'completed').length || 0}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Pending</div>
                <div className="font-bold text-yellow-600">
                  {transactionData?.transactions.filter(tx => tx.status === 'pending').length || 0}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Date Range</div>
                <div className="font-bold text-gray-800">
                  {getDateRange().startDate} to {getDateRange().endDate}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <p>No transaction data available for chart.</p>
          <p className="text-sm mt-2">Complete some transactions to see trends</p>
        </div>
      )}
    </div>
  );
}
