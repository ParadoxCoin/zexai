import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import tr from './locales/tr.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import su from './locales/su.json';
import zh from './locales/zh.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            tr: { translation: tr },
            de: { translation: de },
            es: { translation: es },
            fr: { translation: fr },
            su: { translation: su },
            zh: { translation: zh },
            ru: { translation: ru },
            ar: { translation: ar }
        },
        lng: 'en', // Set English as default
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
