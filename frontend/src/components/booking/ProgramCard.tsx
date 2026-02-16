// frontend/src/components/booking/ProgramCard.tsx
import { useTranslation } from "react-i18next";
import { Program } from "../../context/models";
import { Package, Users, Calendar, ArrowRight } from "lucide-react";

interface ProgramCardProps {
  program: Program;
  onClick: () => void;
}

const ProgramCard = ({ program, onClick }: ProgramCardProps) => {
  const { t } = useTranslation();
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
      case "Tourism":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {program.name}
            </h3>
            <span
              className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getTypeColor(
                program.type,
              )}`}
            >
              {program.type}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Calendar
              className={`w-4 h-4 text-gray-400 dark:text-gray-500 mr-2`}
            />
            {program.variations.map((variation, index) => (
              <span key={index}>{variation.duration} days ,</span>
            ))}
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Package
              className={`w-4 h-4 text-gray-400 dark:text-gray-500 mr-2`}
            />
            <span>
              {program.packages?.length || 0}{" "}
              {t("package", { count: program.packages?.length || 0 })}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Users
              className={`w-4 h-4 text-gray-400 dark:text-gray-500 mr-2`}
            />
            <span>
              <span>
                {t("totalBookings")}: {program.totalBookings || 0}
                {program.maxBookings !== undefined && (
                  <span className="ml-1">
                    / {program.maxBookings || t("unlimited")}
                  </span>
                )}
              </span>
            </span>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end text-blue-600 dark:text-blue-400 font-medium">
        {t("viewBookings")}
        <ArrowRight
          className={`w-4 h-4 transform transition-transform group-hover:translate-x-1 ml-2`}
        />
      </div>
    </div>
  );
};

export default ProgramCard;
