// app/dashboard/soko/components/CopyMessage.tsx
interface CopyMessageProps {
  message: string;
}

export default function CopyMessage({ message }: CopyMessageProps) {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-4 sm:px-6 py-3 rounded-lg shadow-lg animate-slideIn z-50 text-sm sm:text-base">
      {message}
    </div>
  );
}
