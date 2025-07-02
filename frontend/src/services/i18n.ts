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
      employees: "Employees",
      owner: "Owner",

      // Common
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      search: "Search",
      filter: "Filter",
      export: "Export",
      previous: "Previous",
      next: "Next",

      // Dashboard
      totalBookings: "Total Bookings",
      totalRevenue: "Total Revenue",
      totalProfit: "Total Profit",
      totalCosts: "Total Costs",
      activePrograms: "Active Programs",
      welcomeMessage:
        "Welcome to the Travel Agency Dashboard! Here you can manage your programs, bookings, and view reports.",
      // Date Filters
      today: "Today",
      last7Days: "Last 7 Days",
      last30Days: "Last 30 Days",
      lastYear: "Last Year",
      customRange: "Custom",
      errorLoadingDashboard: "Error loading dashboard data.",
      totalPaid: "Total Paid",
      totalRemaining: "Total Remaining",
      programTypeDistribution: "Program Types Distribution",
      quickActions: "Quick Actions",
      newBooking: "New Booking",
      viewReports: "View Reports",
      paymentStatus: "Payment Status",
      fullyPaid: "Fully Paid",
      pending: "Pending",
      recentBookings: "Recent Bookings",
      paid: "Paid",

      // Programs
      programsTitle: "Programs",
      programsSubtitle: "Manage your travel programs and packages",
      searchProgramsPlaceholder: "Search programs... (Press Enter to search)",
      allTypes: "All Types",
      days: "days",
      package_one: "package",
      package_other: "packages",
      noProgramsFound: "No programs found",
      noProgramsLead: "Create your first program to get started.",
      deleteProgramTitle: "Delete Program",
      deleteProgramMessage:
        "Are you sure you want to delete this program? This action cannot be undone and will remove all associated data.",
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
      profitReportTitle: "Profit Report",
      profitReportSubtitle:
        "Comprehensive profit analysis and performance metrics",
      profitMargin: "Profit Margin",
      filters: "Filters:",
      allProgramTypes: "All Program Types",
      profitByProgram: "Profit by Program",
      monthlyProfitTrend: "Monthly Profit Trend",
      detailedProgramPerformance: "Detailed Program Performance",
      totalCost: "Total Cost",
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
      owner: "المالك",

      // Common
      add: "إضافة",
      edit: "تعديل",
      delete: "حذف",
      save: "حفظ",
      cancel: "إلغاء",
      search: "بحث",
      filter: "تصفية",
      export: "تصدير",
      previous: "السابق",
      next: "التالي",

      // Dashboard
      totalBookings: "إجمالي الحجوزات",
      totalRevenue: "إجمالي الإيرادات",
      totalProfit: "إجمالي الأرباح",
      totalCosts: "إجمالي التكاليف",
      activePrograms: "البرامج النشطة",
      welcomeMessage:
        "مرحبًا بك في لوحة تحكم وكالة السفر! هنا يمكنك إدارة برامجك وحجوزاتك وعرض التقارير.",
      today: "اليوم",
      last7Days: "اخر 7 ايام",
      last30Days: "اخر 30 يوما",
      lastYear: "اخر سنة",
      customRange: "مخصص",
      errorLoadingDashboard: "خطأ في تحميل بيانات لوحة التحكم.",
      totalPaid: "إجمالي المدفوع",
      totalRemaining: "إجمالي المتبقي",
      programTypeDistribution: "توزيع أنواع البرامج",
      quickActions: "إجراءات سريعة",
      newBooking: "حجز جديد",
      viewReports: "عرض التقارير",
      paymentStatus: "حالة الدفع",
      fullyPaid: "مدفوع بالكامل",
      pending: "قيد الانتظار",
      recentBookings: "الحجوزات الأخيرة",
      paid: "مدفوع",

      // Programs
      programsTitle: "البرامج",
      programsSubtitle: "إدارة برامج السفر والباقات الخاصة بك",
      searchProgramsPlaceholder: "ابحث عن البرامج... (اضغط على Enter للبحث)",
      allTypes: "جميع الأنواع",
      days: "أيام",
      package_one: "باقة",
      package_other: "باقات",
      noProgramsFound: "لم يتم العثور على برامج",
      noProgramsLead: "ابدأ بإنشاء برنامجك الأول.",
      deleteProgramTitle: "حذف البرنامج",
      deleteProgramMessage:
        "هل أنت متأكد أنك تريد حذف هذا البرنامج؟ لا يمكن التراجع عن هذا الإجراء وسيؤدي إلى إزالة جميع البيانات المرتبطة به.",
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
      profitReportTitle: "تقرير الأرباح",
      profitReportSubtitle: "تحليل شامل للأرباح ومقاييس الأداء",
      profitMargin: "هامش الربح",
      filters: "تصفية:",
      allProgramTypes: "جميع أنواع البرامج",
      profitByProgram: "الربح حسب البرنامج",
      monthlyProfitTrend: "اتجاه الربح الشهري",
      detailedProgramPerformance: "أداء البرنامج التفصيلي",
      totalCost: "التكلفة الإجمالية",
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
      profitReport: "Rapport des Profits",
      roomManagement: "Gestion des Chambres",
      employees: "Employés",
      owner: "Propriétaire",

      // Common
      add: "Ajouter",
      edit: "Modifier",
      delete: "Supprimer",
      save: "Sauvegarder",
      cancel: "Annuler",
      search: "Rechercher",
      filter: "Filtrer",
      export: "Exporter",
      previous: "Précédent",
      next: "Suivant",

      // Dashboard
      totalBookings: "Total Réservations",
      totalRevenue: "Chiffre d'Affaires Total",
      totalProfit: "Profit Total",
      totalCosts: "Coûts Totals",
      activePrograms: "Programmes Actifs",
      welcomeMessage:
        "Bienvenue dans le Tableau de Bord de l'Agence de Voyage ! Ici, vous pouvez gérer vos programmes, réservations et consulter les rapports.",
      today: "Aujourd'hui",
      last7Days: "7 derniers jours",
      last30Days: "30 derniers jours",
      lastYear: "Dernière Année",
      customRange: "Personnalisé",
      errorLoadingDashboard:
        "Erreur de chargement des données du tableau de bord.",
      totalPaid: "Total Payé",
      totalRemaining: "Total Restant",
      programTypeDistribution: "Distribution des Types de Programmes",
      quickActions: "Actions Rapides",
      newBooking: "Nouvelle Réservation",
      viewReports: "Voir les Rapports",
      paymentStatus: "État de Paiement",
      fullyPaid: "Payé en Totalité",
      pending: "En Attente",
      recentBookings: "Réservations Récentes",
      paid: "Payé",

      // Programs
      programsTitle: "Programmes",
      programsSubtitle: "Gérez vos programmes de voyage et vos forfaits",
      searchProgramsPlaceholder:
        "Rechercher des programmes... (Appuyez sur Entrée pour rechercher)",
      allTypes: "Tous les types",
      days: "jours",
      package_one: "forfait",
      package_other: "forfaits",
      noProgramsFound: "Aucun programme trouvé",
      noProgramsLead: "Commencez par créer votre premier programme.",
      deleteProgramTitle: "Supprimer le Programme",
      deleteProgramMessage:
        "Êtes-vous sûr de vouloir supprimer ce programme ? Cette action est irréversible et supprimera toutes les données associées.",
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
      profitReportTitle: "Rapport des Profits",
      profitReportSubtitle:
        "Analyse complète des bénéfices et des indicateurs de performance",
      profitMargin: "Marge Bénéficiaire",
      filters: "Filtres :",
      allProgramTypes: "Tous les types de programmes",
      profitByProgram: "Bénéfice par Programme",
      monthlyProfitTrend: "Tendance Mensuelle des Bénéfices",
      detailedProgramPerformance: "Performance Détaillée du Programme",
      totalCost: "Coût Total",
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
