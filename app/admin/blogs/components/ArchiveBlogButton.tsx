// app/admin/blogs/components/ArchiveBlogButton.tsx
'use client';

import { useTransition } from 'react';
import { archiveBlogPost } from '../../../actions/blog';

interface ArchiveBlogButtonProps {
  postId: string;
  postTitle: string;
}

export function ArchiveBlogButton({ postId, postTitle }: ArchiveBlogButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleArchive = () => {
    if (confirm(`Are you sure you want to archive "${postTitle}"?`)) {
      startTransition(async () => {
        const result = await archiveBlogPost(postId);
        if (result.success) {
          // The page will revalidate due to the revalidatePath in the action
        } else {
          alert(result.message);
        }
      });
    }
  };

  return (
    <button
      onClick={handleArchive}
      disabled={isPending}
      className="text-orange-600 hover:text-orange-900 p-1 rounded-full hover:bg-orange-50 transition-colors disabled:opacity-50"
      title="Archive"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    </button>
  );
}
