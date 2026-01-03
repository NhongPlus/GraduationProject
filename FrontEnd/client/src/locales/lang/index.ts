import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './common/en.json';
import vi from './common/vi.json';
import ja from './common/ja.json';

import errEn from './errors/en.json';
import errVi from './errors/vi.json';
import errJa from './errors/ja.json';

const resources = {
  en: {
    translation: {
      ...en,
      errors: errEn,
    },
  },
  vi: {
    translation: {
      ...vi,
      errors: errVi,
    },
  },
  ja: {
    translation: {
      ...ja,
      errors: errJa,
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'vi',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
