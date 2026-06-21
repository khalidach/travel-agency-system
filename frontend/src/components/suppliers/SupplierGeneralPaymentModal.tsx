import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import Modal from "../Modal";
import NumberInput from "../ui/NumberInput";
import * as api from "../../services/api";
import { toast } from "react-hot-toast";

interface SupplierGeneralPaymentModalProps {
  supplierId: number;
  supplierName: string;
  isOpen: boolean;
  onClose: () => void;
  defaultCurrency?: string;
  totalRemaining?: number;
  payment?: any;
}

export default function SupplierGeneralPaymentModal({
  supplierId,
  supplierName,
  isOpen,
  onClose,
  defaultCurrency = "MAD",
  totalRemaining = 0,
  payment,
}: SupplierGeneralPaymentModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [amountMAD, setAmountMAD] = useState<number>(0);
  const [bookingType, setBookingType] = useState<string>("all");
  const [method, setMethod] = useState<string>("cash");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [labelPaper, setLabelPaper] = useState<string>("");
  const [chequeNumber, setChequeNumber] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [chequeCashingDate, setChequeCashingDate] = useState<string>("");
  const [transferReference, setTransferReference] = useState<string>("");
  const [transferPayerName, setTransferPayerName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (payment) {
        setAmount(Number(payment.amount));
        setCurrency(payment.currency);
        setAmountMAD(Number(payment.amountMAD));
        setBookingType(payment.bookingType || "all");
        setMethod(payment.method);
        setDate(payment.date ? new Date(payment.date).toISOString().split("T")[0] : "");
        setLabelPaper(payment.labelPaper || "");
        setChequeNumber(payment.chequeNumber || "");
        setBankName(payment.bankName || "");
        setChequeCashingDate(payment.chequeCashingDate ? new Date(payment.chequeCashingDate).toISOString().split("T")[0] : "");
        setTransferReference(payment.transferReference || "");
        setTransferPayerName(payment.transferPayerName || "");
      } else {
        setAmount(0);
        setCurrency(defaultCurrency);
        setAmountMAD(0);
        setBookingType("all");
        setMethod("cash");
        setDate(new Date().toISOString().split("T")[0]);
        setLabelPaper("");
        setChequeNumber("");
        setBankName("");
        setChequeCashingDate("");
        setTransferReference("");
        setTransferPayerName("");
      }
      setError(null);
    }
  }, [isOpen, defaultCurrency, payment]);

  const currencies = ["MAD", "SAR", "USD", "EUR", "GBP", "TRY", "CNY"];
  
  const paymentMethods = [
    { value: "cash", label: t("cash") || "Cash" },
    { value: "cheque", label: t("cheque") || "Cheque" },
    { value: "transfer", label: t("transfer") || "Transfer" },
    { value: "card", label: t("card") || "Card" },
    { value: "iata_easypay", label: t("iata_easypay") || "IATA EasyPay" },
  ];

  const isForeignCurrency = currency !== "MAD";

  const addGeneralPaymentMutation = useMutation({
    mutationFn: (paymentData: any) =>
      api.addSupplierGeneralPayment(supplierId, paymentData),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["supplier", String(supplierId)] });
      queryClient.invalidateQueries({ queryKey: ["supplier-general-payments", String(supplierId)] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      
      toast.success(
        t("paymentAdded") || 
        `Payment distributed successfully! Applied: ${data.distributedAmount.toLocaleString()} ${currency}`
      );
      onClose();
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || t("failedToAddPayment");
      toast.error(message);
      setError(message);
    },
  });

  const updateGeneralPaymentMutation = useMutation({
    mutationFn: (paymentData: any) =>
      api.updateSupplierGeneralPayment(supplierId, payment.id, paymentData),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["supplier", String(supplierId)] });
      queryClient.invalidateQueries({ queryKey: ["supplier-general-payments", String(supplierId)] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["profitReport"] });
      
      toast.success(
        t("paymentUpdated") || 
        "Payment updated successfully!"
      );
      onClose();
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || t("failedToUpdatePayment");
      toast.error(message);
      setError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      setError(t("amountGreaterThanZero") || "Amount must be greater than zero.");
      return;
    }

    if (isForeignCurrency && amountMAD <= 0) {
      setError(t("enterEquivalentMAD") || "Please enter the equivalent amount in MAD.");
      return;
    }

    const payload: any = {
      amount,
      currency,
      amountMAD: isForeignCurrency ? amountMAD : amount,
      bookingType,
      date,
      method,
      labelPaper: labelPaper || `General Payment - ${supplierName}`,
    };

    if (method === "cheque") {
      payload.chequeNumber = chequeNumber;
      payload.bankName = bankName;
      payload.chequeCashingDate = chequeCashingDate;
    } else if (method === "transfer") {
      payload.transferReference = transferReference;
      payload.transferPayerName = transferPayerName;
    }

    if (payment) {
      updateGeneralPaymentMutation.mutate(payload);
    } else {
      addGeneralPaymentMutation.mutate(payload);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    setAmount(val);
    if (!isForeignCurrency) {
      setAmountMAD(val);
    }
    setError(null);
  };

  const isPending = addGeneralPaymentMutation.isPending || updateGeneralPaymentMutation.isPending;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={payment ? (t("editGeneralPayment") || "Edit General Payment") : (t("generalPayment") || "General Payment on Supplier")}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {t("supplierName") || "Supplier"}: <span className="font-bold">{supplierName}</span>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              {t("totalRemaining") || "Total Remaining"}: {totalRemaining.toLocaleString()} {defaultCurrency}
            </p>
          </div>
        </div>

        {error && (
          <p className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("paymentAmount") || "Payment Amount"}
            </label>
            <NumberInput
              value={amount || ""}
              onChange={handleAmountChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("currencyChoice") || "Currency"}
            </label>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              {currencies.map((cur) => (
                <option key={cur} value={cur}>
                  {t(`currencyChoicen.${cur}`) || cur}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isForeignCurrency && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("equivalentIn") || "Equivalent in"} (MAD)
            </label>
            <NumberInput
              value={amountMAD || ""}
              onChange={(e) => setAmountMAD(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100"
              min="0"
              step="0.01"
              required
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("bookingType") || "Target Service"}
            </label>
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="all">{t("allServices") || "All Services"}</option>
              <option value="Flight">{t("bookingTypes.Flight") || "Flight"}</option>
              <option value="Hotel">{t("bookingTypes.Hotel") || "Hotel"}</option>
              <option value="Visa">{t("bookingTypes.Visa") || "Visa"}</option>
              <option value="Transfer">{t("bookingTypes.Transfer") || "Transport"}</option>
              <option value="Other">{t("bookingTypes.Other") || "Other"}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("paymentMethod")}
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              {paymentMethods.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("paymentDate")}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("paymentDescription")} ({t("optional")})
            </label>
            <input
              type="text"
              value={labelPaper}
              onChange={(e) => setLabelPaper(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder={t("paymentDescriptionPlaceholder") as string || "e.g. general payment for flights"}
            />
          </div>
        </div>

        {method === "cheque" && (
          <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg space-y-4">
            <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider">Cheque Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t("chequeNumber")}</label>
                <input
                  type="text"
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t("bankName")}</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t("checkCashingDate")}</label>
                <input
                  type="date"
                  value={chequeCashingDate}
                  onChange={(e) => setChequeCashingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {method === "transfer" && (
          <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg space-y-4">
            <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider">Bank Transfer Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t("transferPayerName")}</label>
                <input
                  type="text"
                  value={transferPayerName}
                  onChange={(e) => setTransferPayerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t("transferReference")}</label>
                <input
                  type="text"
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-sm hover:shadow"
          >
            <CreditCard className="w-4 h-4" />
            {isPending ? t("saving") : payment ? t("update") : (t("savePayment") || "Apply Payment")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
