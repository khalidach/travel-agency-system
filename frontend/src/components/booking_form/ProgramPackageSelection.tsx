// frontend/src/components/booking/ProgramPackageSelection.tsx
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { Program, Booking } from "../../context/models";
import { BookingFormData } from "./types";

interface ProgramPackageSelectionProps {
  programs: Program[];
  hasPackages: boolean;
  selectedProgram: Program | null;
  handleProgramChange: (programId: string) => void;
  handleVariationChange: (variationName: string) => void;
  handlePackageChange: (packageName: string) => void;
  programId?: string;
  booking?: Booking | null;
}

const ProgramPackageSelection = ({
  programs,
  hasPackages,
  selectedProgram,
  handleProgramChange,
  handleVariationChange,
  handlePackageChange,
  programId,
  booking,
}: ProgramPackageSelectionProps) => {
  const { t } = useTranslation();
  const {
    control,
    formState: { errors },
  } = useFormContext<BookingFormData>();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("travelProgram")}
        </label>
        <Controller
          name="tripId"
          control={control}
          rules={{ required: t("travelProgramRequired") as string }}
          render={({ field }) => (
            <select
              {...field}
              onChange={(e) => {
                field.onChange(e);
                handleProgramChange(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={!!programId || !booking}
            >
              <option value="">{t("selectAProgram")}</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} ({program.type})
                </option>
              ))}
            </select>
          )}
        />
        {errors.tripId && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">
            {errors.tripId.message}
          </p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Variation
        </label>
        <Controller
          name="variationName"
          control={control}
          rules={{ required: "Variation is required" }}
          render={({ field }) => (
            <select
              {...field}
              onChange={(e) => {
                field.onChange(e);
                handleVariationChange(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={!selectedProgram}
            >
              <option value="">Select a variation</option>
              {(selectedProgram?.variations || []).map((variation) => (
                <option key={variation.name} value={variation.name}>
                  {variation.name} ({variation.duration} {t("days")})
                </option>
              ))}
            </select>
          )}
        />
        {errors.variationName && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">
            {errors.variationName.message}
          </p>
        )}
      </div>
      {hasPackages && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("package")}
          </label>
          <Controller
            name="packageId"
            control={control}
            rules={{
              required: hasPackages ? (t("packageRequired") as string) : false,
            }}
            render={({ field }) => (
              <select
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  handlePackageChange(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                disabled={!selectedProgram}
              >
                <option value="">{t("selectAPackage")}</option>
                {(selectedProgram?.packages || []).map((pkg) => (
                  <option key={pkg.name} value={pkg.name}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.packageId && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {errors.packageId.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgramPackageSelection;
