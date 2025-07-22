import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../translations/en.json";
import ar from "../translations/ar.json";
import fr from "../translations/fr.json";

const resources = {
  en: {
    translation: en,
  },
  ar: {
    translation: ar,
  },
  fr: {
    translation: fr,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "fr", // default language
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
