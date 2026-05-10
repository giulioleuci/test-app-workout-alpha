import { useCallback } from 'react';

import { useTranslation } from 'react-i18next';

import dayjs from '@/lib/dayjs';
import { systemService } from '@/services/systemService';

export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback(async (language: 'en' | 'it' | 'es' | 'fr' | 'zh') => {
    await i18n.changeLanguage(language);
    dayjs.locale(language);
    await systemService.updateGlobalAppState({ language });
  }, [i18n]);

  const syncLanguage = useCallback(async () => {
    const state = await systemService.getGlobalAppState();
    let language = state?.language;

    if (!language) {
      // First run: detect language from i18next and save to global state
      const detected = (i18n.language || 'en').split('-')[0] as 'en' | 'it' | 'es' | 'fr' | 'zh';
      const valid = ['en', 'it', 'es', 'fr', 'zh'].includes(detected) ? detected : 'en';
      await systemService.updateGlobalAppState({ language: valid });
      language = valid;
    }

    if (i18n.language !== language) {
      await i18n.changeLanguage(language);
    }

    if (dayjs.locale() !== language) {
      dayjs.locale(language);
    }
  }, [i18n]);
  return {
    language: i18n.language as 'en' | 'it' | 'es' | 'fr' | 'zh',
    changeLanguage,
    syncLanguage
  };
}
