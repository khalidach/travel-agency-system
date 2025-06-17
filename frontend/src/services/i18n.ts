import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Navigation
      dashboard: "Dashboard",
      programs: "Programs",
      booking: "Booking",
      profitReport: "Profit Report",

      // Common
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      search: "Search",
      filter: "Filter",
      export: "Export",

      // Dashboard
      totalBookings: "Total Bookings",
      totalRevenue: "Total Revenue",
      totalProfit: "Total Profit",
      activePrograms: "Active Programs",

      // Programs
      programName: "Program Name",
      programType: "Program Type",
      duration: "Duration",
      cities: "Cities",
      addProgram: "Add New Program",
      editProgram: "Edit Program",
      // Booking
      clientName: "Client Name",
      passportNumber: "Passport Number",
      sellingPrice: "Selling Price",
      basePrice: "Base Price",
      remainingBalance: "Remaining Balance",
      addBooking: "Add New Booking",
      addPayment: "Add Payment",

      // Payment
      chequeNumber: "Cheque Number",
      bankName: "Bank Name",
      checkCashingDate: "Check Cashing Date",
      
      // Profit Report
      bookings: "Bookings",
      totalSales: "Total Sales",
    },
  },
  ar: {
    translation: {
      // Navigation
      dashboard: "لوحة التحكم",
      programs: "البرامج",
      booking: "الحجوزات",
      profitReport: "تقرير الأرباح",

      // Common
      add: "إضافة",
      edit: "تعديل",
      delete: "حذف",
      save: "حفظ",
      cancel: "إلغاء",
      search: "بحث",
      filter: "تصفية",
      export: "تصدير",

      // Dashboard
      totalBookings: "إجمالي الحجوزات",
      totalRevenue: "إجمالي الإيرادات",
      totalProfit: "إجمالي الأرباح",
      activePrograms: "البرامج النشطة",

      // Programs
      programName: "اسم البرنامج",
      programType: "نوع البرنامج",
      duration: "المدة",
      cities: "المدن",
      addProgram: "إضافة برنامج جديد",
      editProgram: "تعديل البرنامج",

      // Booking
      clientName: "اسم العميل",
      passportNumber: "رقم الجواز",
      sellingPrice: "سعر البيع",
      basePrice: "السعر الأساسي",
      remainingBalance: "الرصيد المتبقي",
      addBooking: "إضافة حجز جديد",
      addPayment: "إضافة دفعة",

      // Profit Report
      bookings: "الحجوزات",
      totalSales: "إجمالي المبيعات",
    },
  },
  fr: {
    translation: {
      // Navigation
      dashboard: "Tableau de Bord",
      programs: "Programmes",
      booking: "Réservations",
      profitReport: "Rapport de Profits",

      // Common
      add: "Ajouter",
      edit: "Modifier",
      delete: "Supprimer",
      save: "Sauvegarder",
      cancel: "Annuler",
      search: "Rechercher",
      filter: "Filtrer",
      export: "Exporter",

      // Dashboard
      totalBookings: "Total Réservations",
      totalRevenue: "Chiffre d'Affaires Total",
      totalProfit: "Profit Total",
      activePrograms: "Programmes Actifs",

      // Programs
      programName: "Nom du Programme",
      programType: "Type de Programme",
      duration: "Durée",
      cities: "Villes",
      addProgram: "Ajouter un Nouveau Programme",
      editProgram: "Modifier le Programme",

      // Booking
      clientName: "Nom du Client",
      passportNumber: "Numéro de Passeport",
      sellingPrice: "Prix de Vente",
      basePrice: "Prix de Base",
      remainingBalance: "Solde Restant",
      addBooking: "Ajouter une Nouvelle Réservation",
      addPayment: "Ajouter un Paiement",

      // Profit Report
      bookings: "Réservations",
      totalSales: "Ventes Totales",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;