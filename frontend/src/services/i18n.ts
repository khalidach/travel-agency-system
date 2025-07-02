import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Navigation
      dashboard: "Dashboard",
      programs: "Programs",
      booking: "Booking",
      programPricing: "Program Pricing",
      profitReport: "Profit Report",
      roomManagement: "Room Management",

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
      TotalCosts: "Total Costs",
      activePrograms: "Active Programs",
      welcomeMessage:
        "Welcome to the Travel Agency Dashboard! Here you can manage your programs, bookings, and view reports.",
      // Date Filters
      today: "Today",
      last7Days: "Last 7 Days",
      last30Days: "Last 30 Days",
      lastYear: "Last Year",
      customRange: "Custom",

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
      programPricing: "تسعير البرنامج",
      profitReport: "تقرير الأرباح",
      roomManagement: "إدارة الغرف",
      employees: "الموظفين",

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
      TotalCosts: "إجمالي التكاليف",
      activePrograms: "البرامج النشطة",
      welcomeMessage:
        "مرحبًا بك في لوحة تحكم وكالة السفر! هنا يمكنك إدارة برامجك وحجوزاتك وعرض التقارير.",
      today: "اليوم",
      last7Days: "اخر 7 ايام",
      last30Days: "اخر 30 يوما",
      lastYear: "اخر سنة",
      customRange: "مخصص",

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
      TotalCosts: "Coûts Totals",
      activePrograms: "Programmes Actifs",
      welcomeMessage:
        "Bienvenue dans le Tableau de Bord de l'Agence de Voyage ! Ici, vous pouvez gérer vos programmes, réservations et consulter les rapports.",
      today: "Aujourd'hui",
      last7Days: "Derniers semaines",
      last30Days: "Derniers mois",
      lastYear: "Dernière Année",
      customRange: "Personnalisé",

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
  lng: "fr",
  fallbackLng: "fr",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
