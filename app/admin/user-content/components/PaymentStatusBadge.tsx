// app/admin/user-content/components/PaymentStatusBadge.tsx
interface PaymentStatusBadgeProps {
  status: 'pending' | 'paid' | 'rejected';
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: 'Payment Pending',
      className: 'bg-yellow-100 text-yellow-800',
    },
    paid: {
      label: 'Paid',
      className: 'bg-green-100 text-green-800',
    },
    rejected: {
      label: 'Payment Rejected',
      className: 'bg-red-100 text-red-800',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
