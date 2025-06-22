import React from "react";
import { Program } from "../../context/models";
import { Package, Users, Calendar, ArrowRight } from "lucide-react";

interface ProgramCardProps {
  program: Program;
  bookingCount: number;
  onClick: () => void;
}

const ProgramCard = ({ program, bookingCount, onClick }: ProgramCardProps) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Hajj":
        return "bg-blue-100 text-blue-700";
      case "Umrah":
        return "bg-emerald-100 text-emerald-700";
      case "Tourism":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {program.name}
            </h3>
            <span
              className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${getTypeColor(
                program.type
              )}`}
            >
              {program.type}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
            <span>{program.duration} days</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Package className="w-4 h-4 mr-2 text-gray-400" />
            <span>{program.packages?.length || 0} packages</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2 text-gray-400" />
            <span>{program.totalBookings || 0} Bookings</span>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end text-blue-600 font-medium">
        View Bookings
        <ArrowRight className="w-4 h-4 ml-2 transform transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  );
};

export default ProgramCard;
