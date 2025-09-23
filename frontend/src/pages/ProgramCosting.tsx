// frontend/src/pages/ProgramCosting.tsx
import React, { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useForm,
  useFieldArray,
  Controller,
  FormProvider,
} from "react-hook-form";
import { toast } from "react-hot-toast";
import { ChevronLeft, Save, Plus, Trash2 } from "lucide-react";
import * as api from "../services/api";
import { Program, ProgramCost } from "../context/models";
import BookingSkeleton from "../components/skeletons/BookingSkeleton";
import { useTranslation } from "react-i18next";

type CostingFormData = Omit<ProgramCost, "id" | "programId" | "totalCost">;

export default function ProgramCosting() {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: program, isLoading: isLoadingProgram } = useQuery<Program>({
    queryKey: ["program", programId],
    queryFn: () => api.getProgramById(programId!),
    enabled: !!programId,
  });

  const { data: existingCosts, isLoading: isLoadingCosts } =
    useQuery<ProgramCost>({
      queryKey: ["programCosts", programId],
      queryFn: () => api.getProgramCosts(programId!),
      enabled: !!programId,
    });

  const methods = useForm<CostingFormData>({
    defaultValues: {
      costs: { hotels: [], custom: [] },
      isEnabled: false,
    },
  });

  const { control, handleSubmit, watch, setValue, reset } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "costs.custom",
  });

  const watchedCosts = watch("costs");
  const isEnabled = watch("isEnabled");

  const distinctHotels = useMemo(() => {
    if (!program) return [];
    const hotelSet = new Set<string>();
    program.packages?.forEach((pkg) => {
      Object.values(pkg.hotels).forEach((hotelList: string[]) => {
        hotelList.forEach((hotelName) => {
          if (hotelName) hotelSet.add(hotelName);
        });
      });
    });
    return Array.from(hotelSet);
  }, [program]);

  useEffect(() => {
    if (existingCosts && program) {
      const hotelCosts = distinctHotels.map((hotel) => {
        const existing = existingCosts.costs?.hotels?.find(
          (h) => h.name === hotel
        );
        return { name: hotel, amount: existing?.amount || 0 };
      });

      reset({
        costs: {
          flightTickets: existingCosts.costs?.flightTickets || 0,
          visa: existingCosts.costs?.visa || 0,
          transport: existingCosts.costs?.transport || 0,
          hotels: hotelCosts,
          custom: existingCosts.costs?.custom || [],
        },
        isEnabled: existingCosts.isEnabled,
      });
    } else if (program) {
      // Initialize for a new entry
      const hotelCosts = distinctHotels.map((hotel) => ({
        name: hotel,
        amount: 0,
      }));
      reset({
        costs: {
          flightTickets: 0,
          visa: 0,
          transport: 0,
          hotels: hotelCosts,
          custom: [],
        },
        isEnabled: false,
      });
    }
  }, [existingCosts, program, distinctHotels, reset]);

  const totalCost = useMemo(() => {
    const costs = watchedCosts;
    let total = 0;
    if (!costs) return 0;

    total += Number(costs.flightTickets) || 0;
    total += Number(costs.visa) || 0;
    total += Number(costs.transport) || 0;
    (costs.hotels || []).forEach(
      (hotel) => (total += Number(hotel.amount) || 0)
    );
    (costs.custom || []).forEach(
      (custom) => (total += Number(custom.amount) || 0)
    );

    return total;
  }, [watchedCosts]);

  const { mutate: saveCosts, isPending: isSaving } = useMutation({
    mutationFn: (data: Partial<ProgramCost>) =>
      api.saveProgramCosts(programId!, data),
    onSuccess: () => {
      toast.success("Costs saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["programCosts", programId] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      queryClient.invalidateQueries({
        queryKey: ["bookingsByProgram", programId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save costs.");
    },
  });

  const onSubmit = (data: CostingFormData) => {
    saveCosts({ ...data, totalCost });
  };

  if (isLoadingProgram || isLoadingCosts) {
    return <BookingSkeleton />;
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/program-costing")}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <ChevronLeft />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {program?.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t("programCostingSubtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <span
                className={`text-sm font-medium ${
                  isEnabled ? "text-green-600" : "text-red-600"
                }`}
              >
                {isEnabled ? t("calculationActive") : t("calculationLocked")}
              </span>
              <label
                htmlFor="isEnabledToggle"
                className="flex items-center cursor-pointer"
              >
                <div className="relative">
                  <Controller
                    name="isEnabled"
                    control={control}
                    render={({ field: { onChange, onBlur, value, ref } }) => (
                      <input
                        type="checkbox"
                        id="isEnabledToggle"
                        className="sr-only"
                        onBlur={onBlur}
                        onChange={onChange}
                        checked={!!value}
                        ref={ref}
                      />
                    )}
                  />
                  <div
                    className={`block w-14 h-8 rounded-full ${
                      isEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  ></div>
                  <div
                    className={`dot absolute left-1 top-1 bg-white dark:bg-gray-300 w-6 h-6 rounded-full transition-transform ${
                      isEnabled ? "translate-x-6" : ""
                    }`}
                  ></div>
                </div>
              </label>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl disabled:bg-gray-400"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? t("saving") : t("save")}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border dark:border-gray-700 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("totalFlightTicketsCost")}
              </label>
              <Controller
                name="costs.flightTickets"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    {...field}
                    className="mt-1 w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("totalVisaCost")}
              </label>
              <Controller
                name="costs.visa"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    {...field}
                    className="mt-1 w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("transportFees")}
              </label>
              <Controller
                name="costs.transport"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    {...field}
                    className="mt-1 w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                  />
                )}
              />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {t("hotels")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {distinctHotels.map((hotel, index) => (
                <div key={hotel}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("totalHotelCost", { hotelName: hotel })}
                  </label>
                  <Controller
                    name={`costs.hotels.${index}.amount`}
                    control={control}
                    render={({ field }) => (
                      <input
                        type="number"
                        {...field}
                        className="mt-1 w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      />
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {t("otherCosts")}
            </h3>
            <div className="space-y-3">
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 items-center"
                >
                  <Controller
                    name={`costs.custom.${index}.name`}
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        placeholder={t("costName") as string}
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      />
                    )}
                  />
                  <Controller
                    name={`costs.custom.${index}.amount`}
                    control={control}
                    render={({ field }) => (
                      <input
                        type="number"
                        {...field}
                        placeholder={t("costAmount") as string}
                        className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => append({ name: "", amount: 0 })}
              className="mt-4 inline-flex items-center px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              <Plus className="w-4 h-4 mr-1" /> {t("addCost")}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 flex justify-end">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {t("totalProgramCost")}:
            </span>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalCost.toLocaleString()} {t("mad")}
            </span>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
