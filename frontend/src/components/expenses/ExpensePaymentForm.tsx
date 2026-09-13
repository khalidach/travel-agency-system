import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Payment, Expense, ExpenseItem } from "../../context/models";
import NumberInput from "../ui/NumberInput";
import { Layers, Sparkles, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";

interface ExpensePaymentFormProps {
  payment?: Payment;
  onSave: (payment: Omit<Payment, "_id" | "id">) => void;
  onCancel: () => void;
  remainingBalance: number;
  currency?: string;
  expense?: Expense;
}

const getInitialFormData = (payment?: Payment): Omit<Payment, "_id" | "id"> => {
  if (payment) {
    return {
      amount: payment.amount,
      amountMAD: payment.amountMAD || payment.amount,
      method: payment.method,
      date: payment.date
        ? new Date(payment.date).toISOString().split("T")[0]
        : "",
      labelPaper: payment.labelPaper || "",
      chequeNumber: payment.chequeNumber || "",
      bankName: payment.bankName || "",
      chequeCashingDate: payment.chequeCashingDate
        ? new Date(payment.chequeCashingDate).toISOString().split("T")[0]
        : "",
      transferReference: payment.transferReference || "",
      transferPayerName: payment.transferPayerName || "",
      itemAllocations: payment.itemAllocations || [],
    };
  }
  return {
    amount: 0,
    amountMAD: 0,
    method: "cash",
    date: new Date().toISOString().split("T")[0],
    labelPaper: "",
    chequeNumber: "",
    bankName: "",
    chequeCashingDate: "",
    transferReference: "",
    transferPayerName: "",
    itemAllocations: [],
  };
};

const getInitialExchangeRate = (payment?: Payment): number | string => {
  return payment && payment.amount && payment.amountMAD
    ? Number((Number(payment.amountMAD) / Number(payment.amount)).toFixed(4))
    : "";
};

export default function ExpensePaymentForm({
  payment,
  onSave,
  onCancel,
  remainingBalance,
  currency = "MAD",
  expense,
}: ExpensePaymentFormProps) {
  const { t } = useTranslation();

  const [prevPayment, setPrevPayment] = useState(payment);
  const [formData, setFormData] = useState(() => getInitialFormData(payment));
  const [exchangeRate, setExchangeRate] = useState<number | string>(() =>
    getInitialExchangeRate(payment),
  );
  const [error, setError] = useState<string | null>(null);

  const items: ExpenseItem[] = useMemo(() => {
    if (!expense?.items) return [];
    return Array.isArray(expense.items) ? expense.items : [];
  }, [expense]);

  const hasMultipleItems = items.length > 1;
  const isIataEasyPay = formData.method === "iata_easypay";
  const showItemAllocation = isIataEasyPay && hasMultipleItems;

  const getItemTotal = (item: ExpenseItem) => {
    if (item.total !== undefined && item.total !== null) return Number(item.total);
    return (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0);
  };

  const itemsTotalSum = useMemo(() => {
    return items.reduce((sum, item) => sum + getItemTotal(item), 0);
  }, [items]);

  const getItemAlreadyPaid = (itemIdx: number) => {
    if (!expense?.advancePayments) return 0;
    return expense.advancePayments.reduce((sum, p) => {
      if (payment && (p._id === payment._id || p.id === payment.id)) return sum;
      if (Array.isArray(p.itemAllocations) && p.itemAllocations.length > 0) {
        const alloc = p.itemAllocations.find((a) => a.itemIndex === itemIdx);
        return sum + (alloc ? Number(alloc.amount) || 0 : 0);
      }
      const itTotal = getItemTotal(items[itemIdx]);
      const prop = itemsTotalSum > 0 ? (itTotal / itemsTotalSum) * Number(p.amount) : 0;
      return sum + prop;
    }, 0);
  };

  const [allocations, setAllocations] = useState<{ [itemIndex: number]: number }>(() => {
    if (payment?.itemAllocations && Array.isArray(payment.itemAllocations)) {
      const map: { [itemIndex: number]: number } = {};
      payment.itemAllocations.forEach((alloc) => {
        map[alloc.itemIndex] = Number(alloc.amount) || 0;
      });
      return map;
    }
    return {};
  });

  const distributeProportionally = (amountToDistribute: number = formData.amount) => {
    if (!hasMultipleItems || amountToDistribute <= 0) {
      setAllocations({});
      return;
    }

    const itemRemainings = items.map((item, idx) => {
      const total = getItemTotal(item);
      const paid = getItemAlreadyPaid(idx);
      return Math.max(0, total - paid);
    });

    const totalRemaining = itemRemainings.reduce((sum, r) => sum + r, 0);
    const baseAmounts = totalRemaining > 0 ? itemRemainings : items.map(getItemTotal);
    const baseTotal = baseAmounts.reduce((sum, b) => sum + b, 0);

    const newAllocations: { [itemIndex: number]: number } = {};
    let distributed = 0;

    items.forEach((_, idx) => {
      if (idx === items.length - 1) {
        newAllocations[idx] = Number(Math.max(0, amountToDistribute - distributed).toFixed(2));
      } else {
        const share = baseTotal > 0
          ? Math.floor(((baseAmounts[idx] / baseTotal) * amountToDistribute) * 100) / 100
          : Math.floor((amountToDistribute / items.length) * 100) / 100;
        newAllocations[idx] = share;
        distributed += share;
      }
    });

    setAllocations(newAllocations);
    setError(null);
  };

  const handleAllocationChange = (index: number, val: number) => {
    setAllocations((prev) => ({
      ...prev,
      [index]: isNaN(val) ? 0 : Math.max(0, val),
    }));
    setError(null);
  };

  const totalAllocated = useMemo(() => {
    return items.reduce((sum, _, idx) => sum + (Number(allocations[idx]) || 0), 0);
  }, [items, allocations]);

  const unallocatedAmount = Number((formData.amount - totalAllocated).toFixed(2));
  const isAllocationValid = Math.abs(unallocatedAmount) <= 0.05;

  if (payment !== prevPayment) {
    setPrevPayment(payment);
    setFormData(getInitialFormData(payment));
    setExchangeRate(getInitialExchangeRate(payment));
    if (payment?.itemAllocations && Array.isArray(payment.itemAllocations)) {
      const map: { [itemIndex: number]: number } = {};
      payment.itemAllocations.forEach((alloc) => {
        map[alloc.itemIndex] = Number(alloc.amount) || 0;
      });
      setAllocations(map);
    } else {
      setAllocations({});
    }
    setError(null);
  }

  // Determine the maximum allowed amount safely
  // We explicitly convert to Number to avoid any string concatenation issues
  const maxAmount = payment
    ? Number(remainingBalance) + Number(payment.amount)
    : Number(remainingBalance);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation is performed here (Soft Validation), allowing user to correct mistakes
    if (formData.amount > maxAmount + 0.1) {
      // 0.1 tolerance for floating point math
      setError(
        t("amountExceedsBalance", {
          balance: `${maxAmount.toLocaleString()} ${currency}`,
        }),
      );
      return;
    }

    if (formData.amount <= 0) {
      setError(t("amountGreaterThanZero"));
      return;
    }

    if (showItemAllocation) {
      if (!isAllocationValid) {
        setError(
          t("allocationMustEqualPayment", {
            allocated: totalAllocated.toLocaleString(),
            total: formData.amount.toLocaleString(),
            currency,
          }) || `مجموع المبالغ الموزعة (${totalAllocated.toLocaleString()} ${currency}) يجب أن يساوي مبلغ الدفعة (${formData.amount.toLocaleString()} ${currency})`
        );
        return;
      }
    }

    // If currency is MAD, ensure amountMAD matches amount
    const finalData = { ...formData };
    if (currency === t("currency.MAD") || currency === "MAD") {
      finalData.amountMAD = finalData.amount;
    } else if (!finalData.amountMAD || finalData.amountMAD <= 0) {
      setError(t("enterEquivalentMAD"));
      return;
    }

    finalData.currency = currency;

    if (showItemAllocation) {
      finalData.itemAllocations = items.map((item, idx) => ({
        itemIndex: idx,
        amount: Number(allocations[idx]) || 0,
        description: item.description,
        passengerName: item.passengerName,
        bookingRef: item.bookingRef,
      }));
    } else {
      delete finalData.itemAllocations;
    }

    onSave(finalData);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Parse the value, but allow empty string or intermediate typing
    const value = e.target.value;
    const amount = parseFloat(value);

    // If it's not a number (e.g. empty string), default to 0 for state, but keep UI responsive
    const validAmount = isNaN(amount) ? 0 : amount;

    setFormData((prev) => {
      const nextData = { ...prev, amount: validAmount };
      if (currency === t("currency.MAD") || currency === "MAD") {
        nextData.amountMAD = validAmount;
      } else {
        const rateVal = typeof exchangeRate === "string" ? parseFloat(exchangeRate) : exchangeRate;
        if (rateVal && rateVal > 0) {
          nextData.amountMAD = Number((validAmount * rateVal).toFixed(2));
        } else if (prev.amountMAD && prev.amountMAD > 0 && validAmount > 0) {
          setExchangeRate(Number((prev.amountMAD / validAmount).toFixed(4)));
        }
      }
      if (nextData.method === "iata_easypay" && hasMultipleItems && validAmount > 0) {
        const currentSum = Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0);
        if (currentSum === 0) {
          setTimeout(() => distributeProportionally(validAmount), 0);
        }
      }
      return nextData;
    });
    setError(null);
  };

  const handleExchangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setExchangeRate(rawVal);
    const rateVal = parseFloat(rawVal);
    if (!isNaN(rateVal) && rateVal > 0) {
      if (formData.amount > 0) {
        setFormData((prev) => ({
          ...prev,
          amountMAD: Number((prev.amount * rateVal).toFixed(2)),
        }));
      }
    }
    setError(null);
  };

  const handleAmountMADChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const madVal = parseFloat(e.target.value) || 0;
    setFormData((prev) => ({ ...prev, amountMAD: madVal }));
    if (formData.amount > 0) {
      setExchangeRate(Number((madVal / formData.amount).toFixed(4)));
    }
    setError(null);
  };

  const paymentMethods = [
    { value: "cash", label: t("cash") },
    { value: "cheque", label: t("cheque") },
    { value: "transfer", label: t("transfer") },
    { value: "card", label: t("card") },
    { value: "iata_easypay", label: t("iata_easypay") || "IATA EasyPay" },
  ];

  const isForeignCurrency =
    currency !== t("currency.MAD") && currency !== "MAD";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("paymentAmount")} ({currency})
          </label>
          <NumberInput
            value={formData.amount || ""}
            onChange={handleAmountChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            min="0"
            step="0.01"
            required
          />
          <div className="flex justify-between mt-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("remainingBalance")}: {remainingBalance.toLocaleString()}{" "}
              {currency}
            </p>
            {/* Show the max amount helper text */}
            <p className="text-xs text-blue-600 dark:text-blue-400 self-center">
              Max limit: {maxAmount.toLocaleString()} {currency}
            </p>
          </div>
        </div>

        {isForeignCurrency && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("exchangeRate") || "Exchange Rate"}
              </label>
              <NumberInput
                value={exchangeRate}
                onChange={handleExchangeRateChange}
                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100"
                min="0"
                step="0.0001"
                required
                placeholder="e.g. 2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t("equivalentIn")} ({t("currency.MAD")})
              </label>
              <NumberInput
                value={formData.amountMAD || ""}
                onChange={handleAmountMADChange}
                className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100"
                min="0"
                step="0.01"
                required
                placeholder={t("amountInMADPlaceholder") as string}
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          {error}
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("paymentMethod")}
        </label>
        <select
          value={formData.method}
          onChange={(e) => {
            const nextMethod = e.target.value as Payment["method"];
            setFormData((prev) => ({
              ...prev,
              method: nextMethod,
            }));
            if (nextMethod === "iata_easypay" && hasMultipleItems && formData.amount > 0) {
              const hasAny = Object.values(allocations).some((v) => Number(v) > 0);
              if (!hasAny) {
                setTimeout(() => distributeProportionally(formData.amount), 0);
              }
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          required
        >
          {paymentMethods.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </div>

      {showItemAllocation && (
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 dark:border-blue-800/40 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {t("itemDistribution")}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("itemDistributionHelp")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => distributeProportionally(formData.amount)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                title={t("autoDistribute") as string}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t("autoDistribute")}
              </button>
              <button
                type="button"
                onClick={() => setAllocations({})}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/60 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title={t("clear") as string}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t("clear") || "مسح"}
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {items.map((item, idx) => {
              const itemTotal = getItemTotal(item);
              const alreadyPaid = getItemAlreadyPaid(idx);
              const itemRem = Math.max(0, itemTotal - alreadyPaid);
              const curAlloc = allocations[idx] !== undefined ? allocations[idx] : "";

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {item.passengerName || item.description || `${t("item")} #${idx + 1}`}
                      </span>
                      {item.bookingRef && (
                        <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 px-2 py-0.5 rounded-full font-mono">
                          PNR: {item.bookingRef}
                        </span>
                      )}
                      {item.ticketCategory && (
                        <span className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {item.ticketCategory}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                      <span>
                        {t("total")}:{" "}
                        <strong className="text-gray-700 dark:text-gray-300">
                          {itemTotal.toLocaleString()} {currency}
                        </strong>
                      </span>
                      {alreadyPaid > 0 && (
                        <span>
                          • {t("previouslyPaid")}:{" "}
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {alreadyPaid.toLocaleString()} {currency}
                          </strong>
                        </span>
                      )}
                      <span>
                        • {t("itemRemaining")}:{" "}
                        <strong className="text-amber-600 dark:text-amber-400">
                          {itemRem.toLocaleString()} {currency}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-32">
                      <NumberInput
                        value={curAlloc}
                        onChange={(e) =>
                          handleAllocationChange(idx, parseFloat(e.target.value))
                        }
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-right font-medium focus:bg-white"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    {itemRem > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAllocationChange(idx, itemRem)}
                        className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800 transition-colors whitespace-nowrap"
                        title={t("fillRemaining") as string}
                      >
                        {t("fillRemaining")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-blue-200/60 dark:border-blue-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-300">
              <span>
                {t("paymentAmount")}:{" "}
                <strong className="text-gray-900 dark:text-white font-semibold">
                  {formData.amount.toLocaleString()} {currency}
                </strong>
              </span>
              <span>
                {t("totalAllocated")}:{" "}
                <strong className="text-blue-600 dark:text-blue-400 font-semibold">
                  {totalAllocated.toLocaleString()} {currency}
                </strong>
              </span>
            </div>

            <div>
              {isAllocationValid ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("fullyAllocated")}
                </span>
              ) : unallocatedAmount > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t("unallocatedAmount")}: {unallocatedAmount.toLocaleString()} {currency}
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t("overAllocated")}: {Math.abs(unallocatedAmount).toLocaleString()} {currency}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t("paymentDate")}
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, date: e.target.value }))
          }
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
          value={formData.labelPaper || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, labelPaper: e.target.value }))
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          placeholder={t("paymentDescriptionPlaceholder") as string}
        />
      </div>

      {formData.method === "cheque" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("chequeNumber")} <span className="text-gray-500 font-normal">({t("optional")})</span>
            </label>
            <input
              type="text"
              value={formData.chequeNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  chequeNumber: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("bankName")} <span className="text-gray-500 font-normal">({t("optional")})</span>
            </label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bankName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("checkCashingDate")} <span className="text-gray-500 font-normal">({t("optional")})</span>
            </label>
            <input
              type="date"
              value={formData.chequeCashingDate}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  chequeCashingDate: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </>
      )}
      {formData.method === "transfer" && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("transferPayerName")} <span className="text-gray-500 font-normal">({t("optional")})</span>
            </label>
            <input
              type="text"
              value={formData.transferPayerName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  transferPayerName: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t("transferReference")} <span className="text-gray-500 font-normal">({t("optional")})</span>
            </label>
            <input
              type="text"
              value={formData.transferReference}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  transferReference: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </>
      )}

      <div className="flex justify-end space-x-4 pt-4 border-t dark:border-gray-600">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t("savePayment")}
        </button>
      </div>
    </form>
  );
}
