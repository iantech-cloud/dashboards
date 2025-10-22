import { Suspense } from 'react';
import ActivateComponent from './ActivateComponent';
import { Loader2 } from 'lucide-react';

export default function ActivationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <Loader2 className="animate-spin w-8 h-8 mx-auto text-indigo-600" />
          <p className="text-gray-600 mt-4">Loading activation page...</p>
        </div>
      </div>
    }>
      <ActivateComponent />
    </Suspense>
  );
}
