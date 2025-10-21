// app/admin/user-content/components/UserContentTypeBadge.tsx
interface UserContentTypeBadgeProps {
  type: 'blog_post' | 'social_media' | 'product_review' | 'video' | 'other';
}

export function UserContentTypeBadge({ type }: UserContentTypeBadgeProps) {
  const typeConfig = {
    blog_post: {
      label: 'Blog Post',
      className: 'bg-blue-100 text-blue-800',
    },
    social_media: {
      label: 'Social Media',
      className: 'bg-purple-100 text-purple-800',
    },
    product_review: {
      label: 'Product Review',
      className: 'bg-green-100 text-green-800',
    },
    video: {
      label: 'Video',
      className: 'bg-red-100 text-red-800',
    },
    other: {
      label: 'Other',
      className: 'bg-gray-100 text-gray-800',
    },
  };

  const config = typeConfig[type];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
