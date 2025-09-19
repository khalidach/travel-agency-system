// frontend/src/components/ui/NewBadge.tsx
import React from "react";
import { useTranslation } from "react-i18next";

const NewBadge = () => {
  const { t } = useTranslation();
  return (
    <span className="absolute top-0 ltr:right-0 rtl:left-0 px-2 text-[12px] font-semibold text-white bg-green-500 rounded-md animate-pulse text-center">
      {t("new")}
    </span>
  );
};

export default NewBadge;
