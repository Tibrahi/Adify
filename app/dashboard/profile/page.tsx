import { ProfileForms } from '@/components/ProfileForms';
import { getCurrentUser } from '@/lib/auth';
import { ALL_COUNTRIES } from '@/lib/countries';

export const metadata = { title: 'Profile & Settings' };

export default async function ProfilePage() {
  const user = (await getCurrentUser())!;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profile & Settings</h1>
      <ProfileForms user={user} countries={ALL_COUNTRIES} />
    </div>
  );
}
