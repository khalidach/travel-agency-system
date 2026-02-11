// frontend/src/pages/ProgramCosting.tsx
import { useEffect, useMemo } from "react";
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

  const { control, handleSubmit, watch, reset } = methods;

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
      Object.values(pkg.hotels).forEach((hotelList) => {
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
          (h) => h.name === hotel,
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
      (hotel) => (total += Number(hotel.amount) || 0),
    );
    (costs.custom || []).forEach(
      (custom) => (total += Number(custom.amount) || 0),
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
      queryClient.invalidateQueries({
        queryKey: ["programsForCosting"],
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
              className="p-2 bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80 transition-colors"
            >
              <ChevronLeft />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {program?.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t("programCostingSubtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <span
                className={`text-sm font-medium  ${
                  isEnabled ? "text-success" : "text-danger"
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
                    className={`block w-14 h-8 rounded-full transition-colors ${
                      isEnabled ? "bg-primary" : "bg-muted"
                    }`}
                  ></div>
                  <div
                    className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                      isEnabled ? "translate-x-6" : ""
                    }`}
                  ></div>
                </div>
              </label>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl disabled:opacity-50 transition-colors"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? t("saving") : t("save")}
            </button>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-8 rounded-2xl shadow-sm border border-border space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("totalFlightTicketsCost")}
              </label>
              <Controller
                name="costs.flightTickets"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    {...field}
                    className="mt-1 w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("totalVisaCost")}
              </label>
              <Controller
                name="costs.visa"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    {...field}
                    className="mt-1 w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">
                {t("transportFees")}
              </label>
              <Controller
                name="costs.transport"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    {...field}
                    className="mt-1 w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
                  />
                )}
              />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t("hotels")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {distinctHotels.map((hotel, index) => (
                <div key={hotel}>
                  <label className="block text-sm font-medium text-foreground">
                    {t("totalHotelCost", { hotelName: hotel })}
                  </label>
                  <Controller
                    name={`costs.hotels.${index}.amount`}
                    control={control}
                    render={({ field }) => (
                      <input
                        type="number"
                        {...field}
                        className="mt-1 w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
                      />
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
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
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
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
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => append({ name: "", amount: 0 })}
              className="mt-4 inline-flex items-center px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" /> {t("addCost")}
            </button>
          </div>
        </div>

        <div className="bg-card text-card-foreground p-6 rounded-2xl shadow-sm border border-border flex justify-end">
          <div className="flex items-center space-x-4">
            <span className="text-lg font-medium text-foreground">
              {t("totalProgramCost")}:
            </span>
            <span className="text-2xl font-bold text-primary">
              {totalCost.toLocaleString()} {t("mad")}
            </span>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
