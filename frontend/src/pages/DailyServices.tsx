// frontend/src/pages/DailyServices.tsx
import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Edit2,
  Trash2,
  ConciergeBell,
  Download,
  HelpCircle,
  CreditCard,
} from "lucide-react";
import * as api from "../services/api";
import {
  DailyService,
  PaginatedResponse,
  FacturationSettings,
  User,
  Payment,
} from "../context/models";
import Modal from "../components/Modal";
import ConfirmationModal from "../components/modals/ConfirmationModal";
import { toast } from "react-hot-toast";
import PaginationControls from "../components/booking/PaginationControls";
import { usePagination } from "../hooks/usePagination";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import ServiceReceiptPDF from "../components/daily_services/ServiceReceiptPDF";
import { useAuthContext } from "../context/AuthContext";
import VideoHelpModal from "../components/VideoHelpModal";
import PaymentForm from "../components/PaymentForm";

// Form Component
const DailyServiceForm = ({
  service,
  onSave,
  onCancel,
}: {
  service?: DailyService | null;
  onSave: (
    data: Omit<
      DailyService,
      // REMOVED 'advancePayments' and other calculated fields from the Omit list
      | "id"
      | "createdAt"
      | "updatedAt"
      | "userId"
      | "employeeId"
      | "vatPaid"
      | "totalPaid"
      // REMOVED 'commission'
      // Added fields that are calculated based on the form's data
      | "profit"
      | "advancePayments"
      | "remainingBalance"
      | "isFullyPaid"
    > & {
      // NOTE: profit is included here to match the payload sent to the backend
      profit: number;
      advancePayments: Payment[];
    }
  ) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    type: service?.type || "airline-ticket",
    serviceName: service?.serviceName || "",
    originalPrice: service?.originalPrice || 0,
    totalPrice: service?.totalPrice || 0,
    date: service?.date
      ? new Date(service.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (service) {
      setFormData({
        type: service.type,
        serviceName: service.serviceName,
        originalPrice: service.originalPrice,
        totalPrice: service.totalPrice,
        date: new Date(service.date).toISOString().split("T")[0],
      });
    }
  }, [service]);

  const profit = useMemo(() => {
    const original = Number(formData.originalPrice) || 0;
    const total = Number(formData.totalPrice) || 0;
    // Profit is the difference between total price and original price
    return total - original;
  }, [formData.originalPrice, formData.totalPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.totalPrice < formData.originalPrice) {
      toast.error(t("totalPriceCannotBeLessThanOriginal"));
      return;
    }
    // We pass payments from the state if they exist, otherwise an empty array.
    onSave({
      ...formData,
      profit,
      advancePayments: service?.advancePayments || [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("serviceType")}
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData({
                ...formData,
                type: e.target.value as DailyService["type"],
              })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="airline-ticket">{t("airline-ticket")}</option>
            <option value="hotel-reservation">{t("hotel-reservation")}</option>
            <option value="reservation-ticket">
              {t("reservation-ticket")}
            </option>
            <option value="visa">{t("visa")}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("serviceName")}
          </label>
          <input
            type="text"
            value={formData.serviceName}
            onChange={(e) =>
              setFormData({ ...formData, serviceName: e.target.value })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("originalPrice")}
          </label>
          <input
            type="number"
            value={formData.originalPrice}
            onChange={(e) =>
              setFormData({
                ...formData,
                originalPrice: Number(e.target.value),
              })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("totalPrice")}
          </label>
          <input
            type="number"
            value={formData.totalPrice}
            onChange={(e) =>
              setFormData({ ...formData, totalPrice: Number(e.target.value) })
            }
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("date")}
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
      </div>
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
        {/* REMOVED Commission line from UI */}
        <div className="flex justify-between font-bold text-lg text-emerald-600 dark:text-emerald-400">
          <span>{t("profit")}:</span>{" "}
          <span>
            {profit.toLocaleString()} {t("mad")}
          </span>
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          {t("save")}
        </button>
      </div>
    </form>
  );
};

// Payment Management Modal for Daily Service
const ServicePaymentManagementModal = ({
  service,
  isOpen,
  onClose,
  onSavePayment,
  onUpdatePayment,
  onDeletePayment,
  onDownloadReceipt, // New prop for receipt download
}: {
  service: DailyService | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (payment: Omit<Payment, "_id" | "id">) => void;
  onUpdatePayment: (
    paymentId: string,
    payment: Omit<Payment, "_id" | "id">
  ) => void;
  onDeletePayment: (paymentId: string) => void;
  onDownloadReceipt: (payment: Payment) => void; // New prop interface
}) => {
  const { t } = useTranslation();
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  if (!isOpen || !service) return null;

  const handleAddPaymentClick = () => {
    setEditingPayment(null);
    setIsPaymentFormOpen(true);
  };

  const handleEditPaymentClick = (payment: Payment) => {
    setEditingPayment(payment);
    setIsPaymentFormOpen(true);
  };

  const handleSavePaymentForm = (paymentData: Omit<Payment, "_id" | "id">) => {
    if (editingPayment) {
      onUpdatePayment(editingPayment._id, paymentData);
    } else {
      onSavePayment(paymentData);
    }
    setIsPaymentFormOpen(false);
    setEditingPayment(null);
  };

  const handleDeletePaymentClick = (paymentId: string) => {
    setPaymentToDelete(paymentId);
  };

  const confirmDeletePayment = () => {
    if (paymentToDelete) {
      onDeletePayment(paymentToDelete);
      setPaymentToDelete(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen && !isPaymentFormOpen}
        onClose={onClose}
        title={t("managePayments")}
        size="xl"
        level={0}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {t("paymentsForService")}
            </h3>
            <button
              onClick={handleAddPaymentClick}
              className="inline-flex items-center px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CreditCard
                className={`w-4 h-4 ${
                  document.documentElement.dir === "rtl" ? "ml-2" : "mr-2"
                }`}
              />
              {t("addPayment")}
            </button>
          </div>
          <div className="space-y-3">
            {(service.advancePayments || []).map((payment, index) => (
              <div
                key={payment._id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <div className="flex items-center">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {Number(payment.amount).toLocaleString()} {t("mad")}
                    </span>
                    <span className="mx-2 text-gray-400 dark:text-gray-500">
                      •
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                      {t(payment.method)}
                    </span>
                    <span className="mx-2 text-gray-400 dark:text-gray-500">
                      •
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {new Date(payment.date).toLocaleDateString()}
                    </span>
                  </div>
                  {payment.method === "cheque" && payment.chequeNumber && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium">
                        {t("chequeNumber")} #{payment.chequeNumber}
                      </span>
                      {payment.bankName && <span> • {payment.bankName}</span>}
                      {payment.chequeCashingDate && (
                        <span>
                          {" "}
                          • {t("checkCashingDate")}:{" "}
                          {new Date(
                            payment.chequeCashingDate
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                  {payment.method === "transfer" &&
                    payment.transferPayerName && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span className="font-medium">
                          {t("transferPayerName")}: {payment.transferPayerName}
                        </span>
                        {payment.transferReference && (
                          <span>
                            {" "}
                            • {t("transferReference")}:{" "}
                            {payment.transferReference}
                          </span>
                        )}
                      </div>
                    )}
                </div>
                <div className="flex space-x-2">
                  {/* ADDED DOWNLOAD BUTTON HERE */}
                  <button
                    onClick={() => onDownloadReceipt(payment)}
                    className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
                    title={t("downloadReceipt") as string}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditPaymentClick(payment)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePaymentClick(payment._id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {(!service.advancePayments ||
              service.advancePayments.length === 0) && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {t("noPaymentsRecorded")}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isPaymentFormOpen}
        onClose={() => setIsPaymentFormOpen(false)}
        title={editingPayment ? t("editPayment") : t("addPayment")}
        size="md"
        level={1}
      >
        <PaymentForm
          payment={editingPayment || undefined}
          onSave={handleSavePaymentForm}
          onCancel={() => setIsPaymentFormOpen(false)}
          remainingBalance={service?.remainingBalance || 0}
        />
      </Modal>

      {paymentToDelete && (
        <ConfirmationModal
          isOpen={!!paymentToDelete}
          onClose={() => setPaymentToDelete(null)}
          onConfirm={confirmDeletePayment}
          title={t("deletePaymentTitle")}
          message={t("deletePaymentMessage")}
        />
      )}
    </>
  );
};

// Main Page Component
export default function DailyServices() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { state: authState } = useAuthContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DailyService | null>(
    null
  );
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [receiptToPreview, setReceiptToPreview] = useState<{
    service: DailyService;
    payment: Payment;
    paymentsBeforeThis: Payment[];
  } | null>(null); // UPDATED State for Receipt Data
  const [serviceToManagePayments, setServiceToManagePayments] =
    useState<DailyService | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const servicesPerPage = 10;

  const { data: servicesResponse, isLoading } = useQuery<
    PaginatedResponse<DailyService>
  >({
    queryKey: ["dailyServices", currentPage],
    queryFn: () => api.getDailyServices(currentPage, servicesPerPage),
    placeholderData: (prev) => prev,
  });

  const { data: settings } = useQuery<FacturationSettings>({
    queryKey: ["settings"],
    queryFn: api.getSettings,
    staleTime: Infinity,
  });

  const services = servicesResponse?.data ?? [];
  const pagination = servicesResponse?.pagination;

  const paginationRange = usePagination({
    currentPage,
    totalCount: pagination?.totalCount ?? 0,
    pageSize: servicesPerPage,
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["dailyServices"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["profitReport"] });
    queryClient.invalidateQueries({ queryKey: ["dailyServiceReport"] });
  };

  const { mutate: createService } = useMutation({
    mutationFn: (data: any) => api.createDailyService(data),
    onSuccess: () => {
      invalidateQueries();
      toast.success(t("serviceCreatedSuccessfully"));
      setIsModalOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: updateService } = useMutation({
    mutationFn: (data: DailyService) => api.updateDailyService(data.id, data),
    onSuccess: () => {
      invalidateQueries();
      toast.success(t("serviceUpdatedSuccessfully"));
      setIsModalOpen(false);
      setEditingService(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: deleteService } = useMutation({
    mutationFn: (id: number) => api.deleteDailyService(id),
    onSuccess: () => {
      invalidateQueries();
      toast.success(t("serviceDeletedSuccessfully"));
      setServiceToDelete(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const { mutate: addPayment } = useMutation({
    mutationFn: (data: {
      serviceId: number;
      payment: Omit<Payment, "_id" | "id">;
    }) => api.addDailyServicePayment(data.serviceId, data.payment),
    onSuccess: (updatedService) => {
      invalidateQueries();
      setServiceToManagePayments(updatedService);
      toast.success(t("paymentAdded"));
    },
    onError: (error: Error) =>
      toast.error(error.message || t("failedToAddPayment")),
  });

  const { mutate: updatePayment } = useMutation({
    mutationFn: (data: {
      serviceId: number;
      paymentId: string;
      payment: Omit<Payment, "_id" | "id">;
    }) =>
      api.updateDailyServicePayment(
        data.serviceId,
        data.paymentId,
        data.payment
      ),
    onSuccess: (updatedService) => {
      invalidateQueries();
      setServiceToManagePayments(updatedService);
      toast.success(t("paymentUpdated"));
    },
    onError: (error: Error) =>
      toast.error(error.message || t("failedToUpdatePayment")),
  });

  const { mutate: deletePayment } = useMutation({
    mutationFn: (data: { serviceId: number; paymentId: string }) =>
      api.deleteDailyServicePayment(data.serviceId, data.paymentId),
    onSuccess: (updatedService) => {
      invalidateQueries();
      setServiceToManagePayments(updatedService);
      toast.success(t("paymentDeleted"));
    },
    onError: (error: Error) =>
      toast.error(error.message || t("failedToDeletePayment")),
  });

  const handleSave = (data: any) => {
    if (editingService) {
      // For updates, we send the new core data (including payments)
      updateService({ ...editingService, ...data });
    } else {
      // For creation, we send the new core data (payments array should be empty in the backend logic)
      createService(data);
    }
  };

  // UPDATED: Function to handle downloading the receipt for a specific payment
  const handleDownloadReceipt = async (
    service: DailyService,
    payment: Payment
  ) => {
    if (!service || !payment) {
      toast.error("Service or payment data not available.");
      return;
    }

    // 1. Filter payments before the current one (using the logic from ServiceReceiptPDF for consistency)
    const allPayments = (service.advancePayments || []).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Find the index of the current payment using its unique _id
    const currentPaymentIndex = allPayments.findIndex(
      (p) => p._id === payment._id
    );

    // Get the array of all payments that occurred before the current one.
    const paymentsBeforeThis = allPayments.slice(0, currentPaymentIndex);

    // 2. Set the data to trigger the hidden PDF component render
    setReceiptToPreview({ service, payment, paymentsBeforeThis });

    // 3. Wait for the DOM to render the receipt component
    await new Promise((resolve) => setTimeout(resolve, 100));

    const input = document.getElementById("service-receipt-pdf-preview");
    if (input) {
      // Calculate the sequential number for the receipt filename
      const sequentialNumber = currentPaymentIndex + 1;
      const receiptFilename = `${t("receipt")}_${service.serviceName.replace(
        /\s/g,
        "_"
      )}_SRV${service.id}_${sequentialNumber}.pdf`;

      html2canvas(input, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a5");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save(receiptFilename);
        setReceiptToPreview(null);
      });
    }
  };

  // UPDATED: Logic for handling download icon click in the table, now redirects to payment modal
  const handleDownloadIconClick = (service: DailyService) => {
    if ((service.advancePayments || []).length === 0) {
      toast.error("No payments recorded to generate a receipt. Add a payment.");
      setServiceToManagePayments(service);
      return;
    }
    setServiceToManagePayments(service);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {t("dailyServicesTitle")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t("dailyServicesSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="p-2 text-gray-500 bg-gray-100 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            aria-label="Help"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <button
            onClick={() => {
              setEditingService(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("newService")}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {[
                "date",
                "serviceName",
                "totalPrice",
                "totalPaid",
                "remainingBalance",
                "status",
                "profit",
                "actions",
              ].map((h) => (
                <th
                  key={h}
                  className={`px-6 py-4 ${
                    i18n.language === "ar" ? "text-right" : "text-left"
                  } text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}
                >
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center p-4">
                  Loading...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-12">
                  <ConciergeBell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t("noServices")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("createFirstService")}
                  </p>
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr
                  key={service.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {new Date(service.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {service.serviceName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {service.totalPrice.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                    {Number(service.totalPaid).toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400">
                    {Number(service.remainingBalance).toLocaleString()}{" "}
                    {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service.isFullyPaid
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                      }`}
                    >
                      {t(service.isFullyPaid ? "fullyPaid" : "pending")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {/* Display profit, which is the same value that used to be commission */}
                    {service.profit.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setServiceToManagePayments(service)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                        title={t("managePayments") as string}
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadIconClick(service)}
                        className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-colors"
                        title={t("downloadReceipt") as string}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingService(service);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setServiceToDelete(service.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {pagination && pagination.totalPages > 1 && (
          <div className="p-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
              paginationRange={paginationRange}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? t("edit") : t("newService")}
      >
        <DailyServiceForm
          service={editingService}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <ServicePaymentManagementModal
        service={serviceToManagePayments}
        isOpen={!!serviceToManagePayments}
        onClose={() => setServiceToManagePayments(null)}
        onSavePayment={(payment) =>
          addPayment({ serviceId: serviceToManagePayments!.id, payment })
        }
        onUpdatePayment={(paymentId, payment) =>
          updatePayment({
            serviceId: serviceToManagePayments!.id,
            paymentId,
            payment,
          })
        }
        onDeletePayment={(paymentId) =>
          deletePayment({ serviceId: serviceToManagePayments!.id, paymentId })
        }
        onDownloadReceipt={(payment) =>
          handleDownloadReceipt(serviceToManagePayments!, payment)
        }
      />

      <ConfirmationModal
        isOpen={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        onConfirm={() => deleteService(serviceToDelete!)}
        title={t("deleteServiceTitle")}
        message={t("deleteServiceMessage")}
      />

      {/* Hidden container for PDF generation */}
      {receiptToPreview && (
        <div style={{ position: "fixed", left: "-9999px", top: "-9999px" }}>
          <div
            id="service-receipt-pdf-preview"
            style={{ width: "210mm", height: "297mm" }}
          >
            <ServiceReceiptPDF
              service={receiptToPreview.service}
              payment={receiptToPreview.payment}
              paymentsBeforeThis={receiptToPreview.paymentsBeforeThis}
              settings={settings}
              user={authState.user}
            />
          </div>
        </div>
      )}
      <VideoHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        videoId="xSwWyVLuGYY"
        title="Daily Services Management"
      />
    </div>
  );
}
