import 'i18next';
import ns1 from '../i18n/locales/it/translation.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof ns1;
    };
  }
}
