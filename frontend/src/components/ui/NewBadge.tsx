// frontend/src/components/ui/NewBadge.tsx
import { useTranslation } from "react-i18next";

const NewBadge = () => {
  const { t } = useTranslation();
  return (
    <span className="absolute top-0 ltr:right-0 rtl:left-0 px-2 text-[12px] font-semibold text-success-foreground bg-success rounded-md animate-pulse text-center">
      {t("new")}
    </span>
  );
};

export default NewBadge;
