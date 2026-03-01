import { useState } from "react";
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

import DailyServiceForm from "../components/daily_services/DailyServiceForm";
import ServicePaymentManagementModal from "../components/daily_services/ServicePaymentManagementModal";

type DailyServiceFormValues = Pick<
  DailyService,
  "serviceName" | "date" | "type" | "originalPrice" | "totalPrice"
>;

type DailyServiceApiInput = Omit<
  DailyService,
  "id" | "createdAt" | "updatedAt"
>;

export default function DailyServices() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { state: authState } = useAuthContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DailyService | null>(
    null,
  );
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [receiptToPreview, setReceiptToPreview] = useState<{
    service: DailyService;
    payment: Payment;
    paymentsBeforeThis: Payment[];
  } | null>(null);
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
    mutationFn: (data: DailyServiceApiInput) => api.createDailyService(data),
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
        data.payment,
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

  const handleSave = (data: DailyServiceFormValues) => {
    if (editingService) {
      const updatedService: DailyService = {
        ...editingService,
        ...data,
        profit: data.totalPrice - data.originalPrice,
      };
      updateService(updatedService);
    } else {
      if (!authState.user) {
        toast.error("User authentication error");
        return;
      }
      const newService: DailyServiceApiInput = {
        ...data,
        userId: authState.user.id,
        profit: data.totalPrice - data.originalPrice,
        remainingBalance: data.totalPrice,
        isFullyPaid: false,
        advancePayments: [],
      } as DailyServiceApiInput;

      createService(newService);
    }
  };

  const handleDownloadReceipt = async (
    service: DailyService,
    payment: Payment,
  ) => {
    if (!service || !payment) {
      toast.error("Service or payment data not available.");
      return;
    }

    const allPayments = (service.advancePayments || []).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const currentPaymentIndex = allPayments.findIndex(
      (p) => p._id === payment._id,
    );
    const paymentsBeforeThis = allPayments.slice(0, currentPaymentIndex);

    setReceiptToPreview({ service, payment, paymentsBeforeThis });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const input = document.getElementById("service-receipt-pdf-preview");
    if (input) {
      const sequentialNumber = currentPaymentIndex + 1;
      const receiptFilename = `${t("receipt")}_${service.serviceName.replace(/\s/g, "_")}_SRV${service.id}_${sequentialNumber}.pdf`;

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
          <h1 className="text-3xl font-bold text-foreground">
            {t("dailyServicesTitle")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("dailyServicesSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="p-2 text-muted-foreground bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
            aria-label="Help"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <button
            onClick={() => {
              setEditingService(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t("newService")}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
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
                  className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center p-4 text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-12">
                  <ConciergeBell className="w-12 h-12 mx-auto text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium text-foreground">
                    {t("noServices")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("createFirstService")}
                  </p>
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr
                  key={service.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(service.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {service.serviceName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                    {service.totalPrice.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-info">
                    {Number(service.totalPaid).toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-warning">
                    {Number(service.remainingBalance).toLocaleString()}{" "}
                    {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${Number(service.totalPaid) === 0
                        ? "bg-destructive/10 text-destructive"
                        : service.isFullyPaid
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                        }`}
                    >
                      {Number(service.totalPaid) === 0
                        ? t("notPaid")
                        : t(service.isFullyPaid ? "fullyPaid" : "pending")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-success">
                    {service.profit.toLocaleString()} {t("mad")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setServiceToManagePayments(service)}
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        title={t("managePayments") as string}
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadIconClick(service)}
                        className="p-2 text-muted-foreground hover:text-success transition-colors"
                        title={t("downloadReceipt") as string}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingService(service);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-info transition-colors"
                        title={t("edit") as string}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setServiceToDelete(service.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        title={t("delete") as string}
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
          <div className="p-4 border-t border-border">
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
        size="xl"
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
