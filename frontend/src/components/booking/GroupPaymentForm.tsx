import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Payment, Booking } from "../../context/models";
import NumberInput from "../ui/NumberInput";
import { Users, RotateCcw } from "lucide-react";

interface GroupPaymentFormProps {
    payment?: Payment;
    onSave: (payment: Omit<Payment, "_id" | "id"> & { allocations?: Record<string | number, number> }) => void;
    onCancel: () => void;
    groupRemainingBalance: number;
    groupBookings?: Booking[];
    currentBookingId?: number | string;
}

interface MemberItem {
    id: number;
    name: string;
    isLeader: boolean;
    trueRemaining: number;
    previousShare: number;
}

const computeEqualDistribution = (total: number, members: MemberItem[]) => {
    let amountLeft = Number(total) || 0;
    const result: Record<number, number> = {};
    members.forEach((m) => {
        result[m.id] = 0;
    });

    if (amountLeft <= 0 || members.length === 0) return result;

    const leader = members.find((m) => m.isLeader);
    const ordered = leader ? [leader, ...members.filter((m) => !m.isLeader)] : [...members];

    let active = ordered.filter((m) => m.trueRemaining > 0);

    while (amountLeft > 0.001 && active.length > 0) {
        const share = amountLeft / active.length;
        let anyCapped = false;

        for (const m of active) {
            const cap = m.trueRemaining - result[m.id];
            if (cap < share - 0.0001) {
                result[m.id] = Math.round((result[m.id] + cap) * 100) / 100;
                amountLeft = Math.round((amountLeft - cap) * 100) / 100;
                anyCapped = true;
            }
        }

        if (anyCapped) {
            active = active.filter((m) => {
                const cap = m.trueRemaining - result[m.id];
                return cap > 0.001;
            });
        } else {
            const shareRounded = Math.floor((amountLeft / active.length) * 100) / 100;
            let totalDistributed = 0;
            active.forEach((m) => {
                result[m.id] = Math.round((result[m.id] + shareRounded) * 100) / 100;
                totalDistributed += shareRounded;
            });
            amountLeft = Math.round((amountLeft - totalDistributed) * 100) / 100;

            for (const m of active) {
                if (amountLeft <= 0.001) break;
                result[m.id] = Math.round((result[m.id] + 0.01) * 100) / 100;
                amountLeft = Math.round((amountLeft - 0.01) * 100) / 100;
            }
            break;
        }
    }

    if (amountLeft > 0.001) {
        const topPerson = leader || ordered[0];
        result[topPerson.id] = Math.round((result[topPerson.id] + amountLeft) * 100) / 100;
    }

    return result;
};

export default function GroupPaymentForm({
    payment,
    onSave,
    onCancel,
    groupRemainingBalance,
    groupBookings = [],
    currentBookingId,
}: GroupPaymentFormProps) {
    const { t } = useTranslation();

    // Map group members with true remaining balance
    const members: MemberItem[] = useMemo(() => {
        return groupBookings.map((b) => {
            const isLeader = b.id === Number(currentBookingId) || (!!b.relatedPersons && b.relatedPersons.length > 0);
            const payments = b.advancePayments || [];
            let previousShare = 0;
            if (payment) {
                const found = payments.find(
                    (p: any) =>
                        (p._id === payment._id || (payment.paymentID && p.paymentID === payment.paymentID)) &&
                        p.isGroupPayment
                );
                if (found) {
                    previousShare = Number(found.amount || 0);
                }
            }

            const trueRemaining = Number(b.remainingBalance || 0) + previousShare;
            const fr = b.clientNameFr ? `${b.clientNameFr.firstName || ""} ${b.clientNameFr.lastName || ""}`.trim() : "";
            const ar = b.clientNameAr || "";
            const name = fr && ar ? `${fr} (${ar})` : (fr || ar || `Client #${b.id}`);

            return {
                id: b.id,
                name,
                isLeader,
                trueRemaining: Math.max(0, trueRemaining),
                previousShare,
            };
        });
    }, [groupBookings, currentBookingId, payment]);

    const getInitialFormData = useCallback((): Omit<Payment, "_id" | "id"> => {
        if (payment) {
            return {
                amount: Number(payment.groupAmount || payment.amount || 0),
                amountMAD: Number(payment.amountMAD || payment.amount || 0),
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
                forWhat: payment.forWhat || "",
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
            forWhat: "",
        };
    }, [payment]);

    const [formData, setFormData] = useState(getInitialFormData());
    const [allocations, setAllocations] = useState<Record<number, number>>({});
    const [isManualAllocations, setIsManualAllocations] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Calculate maximum allowed amount
    const maxAmount = payment
        ? Number(groupRemainingBalance) + Number(payment.groupAmount || payment.amount || 0)
        : Number(groupRemainingBalance);

    useEffect(() => {
        setFormData(getInitialFormData());
        setError(null);
        if (payment) {
            const initialAllocs: Record<number, number> = {};
            members.forEach((m) => {
                initialAllocs[m.id] = m.previousShare;
            });
            setAllocations(initialAllocs);
            setIsManualAllocations(true);
        } else {
            setAllocations({});
            setIsManualAllocations(false);
        }
    }, [getInitialFormData, members, payment]);

    // Handle Total Amount Change
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        const amount = isNaN(value) ? 0 : value;

        setFormData((prev) => ({ ...prev, amount, amountMAD: amount }));
        setError(null);

        // If not in manual mode, auto-distribute equally
        if (!isManualAllocations) {
            const distributed = computeEqualDistribution(amount, members);
            setAllocations(distributed);
        }
    };

    // Handle Individual Member Allocation Change
    const handleMemberAllocationChange = (memberId: number, val: number) => {
        setIsManualAllocations(true);
        const nextAllocs = {
            ...allocations,
            [memberId]: Math.max(0, val),
        };
        setAllocations(nextAllocs);

        // Update total amount to match sum of allocations
        const sum = Object.values(nextAllocs).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
        const roundedSum = Math.round(sum * 100) / 100;
        setFormData((prev) => ({
            ...prev,
            amount: roundedSum,
            amountMAD: roundedSum,
        }));
        setError(null);
    };

    // Reset to Equal Distribution button
    const handleDistributeEqually = () => {
        const distributed = computeEqualDistribution(formData.amount, members);
        setAllocations(distributed);
        setIsManualAllocations(false);
        setError(null);
    };

    const totalAllocated = useMemo(() => {
        return Math.round(
            Object.values(allocations).reduce((acc, curr) => acc + (Number(curr) || 0), 0) * 100
        ) / 100;
    }, [allocations]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.amount > maxAmount + 0.1) {
            setError(
                t("amountExceedsBalance", {
                    balance: `${maxAmount.toLocaleString()} MAD`,
                }) || `Amount exceeds group remaining balance (${maxAmount.toLocaleString()} MAD)`
            );
            return;
        }

        if (formData.amount <= 0) {
            setError(t("amountGreaterThanZero") || "Amount must be greater than zero");
            return;
        }

        // If in manual mode, ensure allocations sum matches amount
        if (isManualAllocations && Math.abs(totalAllocated - formData.amount) > 0.05) {
            setError(
                `The sum of individual member amounts (${totalAllocated.toLocaleString()} MAD) must match the total group amount (${formData.amount.toLocaleString()} MAD).`
            );
            return;
        }

        const finalData = { ...formData };
        finalData.amountMAD = finalData.amount;

        onSave({
            ...finalData,
            allocations: isManualAllocations ? allocations : undefined,
        });
    };

    const paymentMethods = [
        { value: "cash", label: t("cash") },
        { value: "cheque", label: t("cheque") },
        { value: "transfer", label: t("transfer") },
        { value: "card", label: t("card") },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t("groupPaymentAmount") || "Group Payment Amount"} (MAD)
                    </label>
                    <NumberInput
                        value={formData.amount || ""}
                        onChange={handleAmountChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg font-bold"
                        min="0"
                        step="0.01"
                        required
                    />
                    <div className="flex justify-between mt-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t("groupRemaining") || "Group Remaining"}: {groupRemainingBalance.toLocaleString()} MAD
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 self-center">
                            {t("maxLimit") || "Max limit"}: {maxAmount.toLocaleString()} MAD
                        </p>
                    </div>
                </div>
            </div>

            {/* Member Breakdown & Allocation Section */}
            {members.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/40 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {t("groupDistribution") || "Distribution among group members"}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isManualAllocations
                                        ? (t("manualDistributionActive") || "Custom amounts entered. System will use your specified breakdown.")
                                        : (t("autoDistributionActive") || "Automatic equal distribution active.")}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleDistributeEqually}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors self-start sm:self-auto"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            {t("distributeEqually") || "Distribute equally"}
                        </button>
                    </div>

                    <div className="space-y-2 mt-3 max-h-56 overflow-y-auto pr-1">
                        {members.map((member) => {
                            const allocVal = allocations[member.id] !== undefined ? allocations[member.id] : "";
                            return (
                                <div
                                    key={member.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-gray-700/60 rounded-lg border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                {member.name}
                                            </span>
                                            {member.isLeader && (
                                                <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
                                                    {t("leader") || "Leader"}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {t("remaining") || "Remaining"}:{" "}
                                            <span className="font-medium text-red-600 dark:text-red-400">
                                                {member.trueRemaining.toLocaleString()} MAD
                                            </span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 sm:w-44">
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {t("amount") || "Amount"}:
                                        </span>
                                        <NumberInput
                                            value={allocVal}
                                            onChange={(e) =>
                                                handleMemberAllocationChange(member.id, parseFloat(e.target.value) || 0)
                                            }
                                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-right"
                                            placeholder="0"
                                            min="0"
                                            step="0.01"
                                        />
                                        <span className="text-xs text-gray-400 font-medium">MAD</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-between items-center pt-2 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700">
                        <span>{t("totalAllocated") || "Total Allocated"}:</span>
                        <span className={`font-bold text-sm ${Math.abs(totalAllocated - formData.amount) > 0.05 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {totalAllocated.toLocaleString()} / {formData.amount.toLocaleString()} MAD
                        </span>
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-200 dark:border-red-800">
                    {error}
                </p>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("paymentMethod")}
                </label>
                <select
                    value={formData.method}
                    onChange={(e) =>
                        setFormData((prev) => ({
                            ...prev,
                            method: e.target.value as Payment["method"],
                        }))
                    }
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

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("labelPaper")}{" "}
                    <span className="text-gray-500 font-normal">({t("optional")})</span>
                </label>
                <input
                    type="text"
                    value={formData.labelPaper}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, labelPaper: e.target.value }))
                    }
                    placeholder={t("labelPaperPlaceholder") as string || "e.g. receipt note"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t("forWhat")} <span className="text-gray-500 font-normal">({t("optional")})</span>
                </label>
                <input
                    type="text"
                    value={formData.forWhat}
                    onChange={(e) =>
                        setFormData((prev) => ({ ...prev, forWhat: e.target.value }))
                    }
                    placeholder={t("forWhatPlaceholder") as string || "e.g. for Umrah trip"}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
            </div>

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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                    {t("savePayment")}
                </button>
            </div>
        </form>
    );
}
