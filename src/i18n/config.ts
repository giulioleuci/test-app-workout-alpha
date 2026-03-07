import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import translationIT from './locales/it/translation.json';

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: {
        translation: translationIT,
      },
    },
    fallbackLng: 'it',
    returnObjects: true,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;
