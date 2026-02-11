// frontend/src/components/booking/RoomProgramCard.tsx
import { useTranslation } from "react-i18next";
import { Program } from "../../context/models";
import { Hotel, BedDouble, Users, ArrowRight } from "lucide-react";

interface RoomProgramCardProps {
  program: Program;
  onClick: () => void;
}

const RoomProgramCard = ({ program, onClick }: RoomProgramCardProps) => {
  const { t } = useTranslation();

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "Tourism":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const hotelRoomCounts = program.hotelRoomCounts || [];
  const occupantCount = program.totalOccupants || 0;

  // Filter to only include hotels that have rooms managed.
  const hotelsWithRooms = hotelRoomCounts.filter(
    (stat) => stat.roomCount && stat.roomCount > 0,
  );
  const hotelCount = hotelRoomCounts.length;

  function containsArabic(text: string) {
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
  }

  return (
    <div
      onClick={onClick}
      className="group bg-card text-card-foreground rounded-xl p-6 shadow-sm border border-border hover:shadow-md hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-card-foreground">
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
          <div className="flex items-center text-sm text-muted-foreground">
            <Hotel
              className={`w-4 h-4 text-muted-foreground ${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />
            <span>
              {hotelCount} {t("hotels", { count: hotelCount })}
            </span>
          </div>
          <div className="flex items-start text-sm text-muted-foreground">
            <BedDouble
              className={`w-4 h-4 text-muted-foreground mt-0.5 ${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />

            <div className="flex flex-col">
              {hotelsWithRooms.length > 0 ? (
                hotelsWithRooms.map((stat) => {
                  const isArabic = containsArabic(stat.hotelName);
                  return (
                    <span
                      dir={isArabic ? "rtl" : "ltr"}
                      className="text-left"
                      key={stat.hotelName}
                    >
                      <span dir={isArabic ? "rtl" : "ltr"}>
                        {stat.hotelName}:
                      </span>{" "}
                      <span dir="ltr">
                        {stat.roomCount} {t("rooms", { count: stat.roomCount })}
                      </span>
                    </span>
                  );
                })
              ) : (
                <span>0 {t("rooms", { count: 0 })}</span>
              )}
            </div>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users
              className={`w-4 h-4 text-muted-foreground ${
                document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
              }`}
            />
            <span>
              {occupantCount} {t("members", { count: occupantCount })}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-border flex items-center justify-end text-primary font-medium">
        {t("viewRooms")}
        <ArrowRight
          className={`w-4 h-4 transform transition-transform group-hover:translate-x-1 ${
            document.documentElement.dir === "rtl" ? "mr-2" : "ml-2"
          }`}
        />
      </div>
    </div>
  );
};

export default RoomProgramCard;
