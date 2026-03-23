import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from '@/lib/dayjs';
import { systemService } from '@/services/systemService';

export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback(async (language: 'it' | 'en') => {
    await i18n.changeLanguage(language);
    dayjs.locale(language);
    await systemService.updateGlobalAppState({ language });
  }, [i18n]);

  const syncLanguage = useCallback(async () => {
    const state = await systemService.getGlobalAppState();
    const language = state?.language || 'it';
    
    if (i18n.language !== language) {
      await i18n.changeLanguage(language);
    }
    if (dayjs.locale() !== language) {
      dayjs.locale(language);
    }
  }, [i18n]);

  return {
    language: i18n.language as 'it' | 'en',
    changeLanguage,
    syncLanguage
  };
}
