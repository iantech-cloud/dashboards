// app/admin/blogs/components/BlogStatusBadge.tsx
interface BlogStatusBadgeProps {
  status: 'draft' | 'published' | 'archived';
}

export function BlogStatusBadge({ status }: BlogStatusBadgeProps) {
  const statusConfig = {
    draft: {
      label: 'Draft',
      className: 'bg-yellow-100 text-yellow-800',
    },
    published: {
      label: 'Published',
      className: 'bg-green-100 text-green-800',
    },
    archived: {
      label: 'Archived',
      className: 'bg-gray-100 text-gray-800',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
