import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import tr from './locales/tr.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';
import zh from './locales/zh.json';
import su from './locales/su.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
      fr: { translation: fr },
      de: { translation: de },
      es: { translation: es },
      zh: { translation: zh },
      su: { translation: su }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
