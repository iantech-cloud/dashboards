// app/admin/surveys/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { redirect } from 'next/navigation';
import { connectToDatabase, Profile } from '@/app/lib/models';
import SurveysManagement from './SurveysManagement';

export default async function AdminSurveysPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/auth/login');
  }

  await connectToDatabase();
  const user = await Profile.findOne({ email: session.user.email });

  if (!user || user.role !== 'admin') {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Surveys Management</h1>
          <p className="text-gray-600 mt-2">
            Create and manage AI-generated surveys for users
          </p>
        </div>
      </div>

      <SurveysManagement />
    </div>
  );
}
