import { useTranslation } from 'react-i18next';

import { UserProfile } from '@/domain/entities';
import dayjs from '@/lib/dayjs';

interface DashboardGreetingProps {
  userProfile: UserProfile | undefined;
  lastWorkoutDate: Date | undefined;
}

export default function DashboardGreeting({ userProfile, lastWorkoutDate }: DashboardGreetingProps) {
  const { t } = useTranslation();

  const buildGreeting = () => {
    if (!userProfile) return t('nav.dashboard');
    const daysSinceLast = lastWorkoutDate 
      ? dayjs().diff(dayjs(lastWorkoutDate), 'day')
      : 0;

    if (daysSinceLast < 7) {
      return t('profile.greeting', { name: userProfile.name });
    } else {
      return t(`profile.welcomeBack.${userProfile.gender}`, { name: userProfile.name });
    }
  };

  const greetingText = buildGreeting();

  return (
    <div>
      <h1 className="text-h2">
        {greetingText || t('nav.dashboard')}
      </h1>
    </div>
  );
}
