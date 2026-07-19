import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en/translation.json';
import translationES from './locales/es/translation.json';
import translationFR from './locales/fr/translation.json';
import translationIT from './locales/it/translation.json';
import translationZH from './locales/zh/translation.json';

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: translationEN,
      },
      it: {
        translation: translationIT,
      },
      es: {
        translation: translationES,
      },
      fr: {
        translation: translationFR,
      },
      zh: {
        translation: translationZH,
      },
    },
    fallbackLng: 'en',
    returnObjects: true,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18next;
