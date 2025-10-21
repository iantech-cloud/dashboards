// app/admin/user-content/components/UserContentStatusBadge.tsx
interface UserContentStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
}

export function UserContentStatusBadge({ status }: UserContentStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: 'Pending Review',
      className: 'bg-yellow-100 text-yellow-800',
    },
    approved: {
      label: 'Approved',
      className: 'bg-green-100 text-green-800',
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 text-red-800',
    },
    revision_requested: {
      label: 'Revision Requested',
      className: 'bg-orange-100 text-orange-800',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
