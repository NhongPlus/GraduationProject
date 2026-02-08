import { useTranslation } from "react-i18next";

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const language = i18n.resolvedLanguage as "vi" | "en" | "ja";

  const changeLanguage = async (lang: "vi" | "en" | "ja") => {
    await i18n.changeLanguage(lang);
  };
  return {
    language,
    changeLanguage,
  };
};
