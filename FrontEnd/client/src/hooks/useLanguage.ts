import { useTranslation } from "react-i18next";

const LANG_STORAGE_KEY = 'app_language';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const language = i18n.resolvedLanguage as "vi" | "en" | "ja";

  const changeLanguage = async (lang: "vi" | "en" | "ja") => {
    await i18n.changeLanguage(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  };
  return {
    language,
    changeLanguage,
  };
};
