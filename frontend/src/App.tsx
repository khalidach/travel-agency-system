// frontend/src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./services/i18n";
import { Toaster } from "react-hot-toast";
import { Suspense, lazy, useMemo, useEffect } from "react";

import { AuthProvider, useAuthContext } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Layout from "./components/Layout";
import useIdleTimeout from "./services/useIdleTimeout";
import BookingSkeleton from "./components/skeletons/BookingSkeleton";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy imports
const HomePage = lazy(() => import("./pages/HomePage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Programs = lazy(() => import("./pages/Programs"));
const Booking = lazy(() => import("./pages/Booking"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const ProfitReport = lazy(() => import("./pages/ProfitReport"));
const ProgramPricing = lazy(() => import("./pages/ProgramPricing"));
const ProgramCostingList = lazy(() => import("./pages/ProgramCostingList"));
const ProgramCosting = lazy(() => import("./pages/ProgramCosting"));
const EmployeesPage = lazy(() => import("./pages/Employees"));
const EmployeeAnalysisPage = lazy(() => import("./pages/EmployeeAnalysis"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const OwnerPage = lazy(() => import("./pages/Owner"));
const TiersPage = lazy(() => import("./pages/Tiers"));
const RoomManagementPage = lazy(() => import("./pages/RoomManagementPage"));
const RoomManage = lazy(() => import("./pages/RoomManage"));
const Facturation = lazy(() => import("./pages/Facturation"));
const Settings = lazy(() => import("./pages/Settings"));
const DailyServices = lazy(() => import("./pages/DailyServices"));
const DailyServiceReport = lazy(() => import("./pages/DailyServiceReport"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Suppliers = lazy(() => import("./pages/Suppliers")); // <--- NEW IMPORT
const SupplierAnalysis = lazy(() => import("./pages/SupplierAnalysis")); // <--- NEW IMPORT
const AgencyReportsList = lazy(() => import("./pages/AgencyReports"));
const AgencyDetailedReport = lazy(() => import("./pages/AgencyDetailedReport"));

function AppRoutes() {
  const { state } = useAuthContext();
  const user = state.user;
  const userRole = user?.role;

  // Role/Limit Checks
  const hasInvoicingAccess = useMemo(() => {
    if (!user) return false;
    if (typeof user.limits?.invoicing === "boolean")
      return user.limits.invoicing;
    if (typeof user.tierLimits?.invoicing === "boolean")
      return user.tierLimits.invoicing;
    if (user.tierId) return user.tierId !== 1;
    return false;
  }, [user]);

  const hasDailyServiceAccess = useMemo(() => {
    if (!user) return false;
    if (typeof user.limits?.dailyServices === "boolean")
      return user.limits.dailyServices;
    if (typeof user.tierLimits?.dailyServices === "boolean")
      return user.tierLimits.dailyServices;
    return false;
  }, [user]);

  const hasProgramCostAccess = useMemo(() => {
    if (!user) return false;
    if (typeof user.limits?.programCosts === "boolean")
      return user.limits.programCosts;
    if (typeof user.tierLimits?.programCosts === "boolean")
      return user.tierLimits.programCosts;
    return false;
  }, [user]);

  const hasProfitReportAccess = useMemo(() => {
    if (!user) return false;
    if (typeof user.limits?.profitReport === "boolean")
      return user.limits.profitReport;
    if (typeof user.tierLimits?.profitReport === "boolean")
      return user.tierLimits.profitReport;
    return false;
  }, [user]);

  const hasEmployeeAnalysisAccess = useMemo(() => {
    if (!user) return false;
    if (typeof user.limits?.employeeAnalysis === "boolean")
      return user.limits.employeeAnalysis;
    if (typeof user.tierLimits?.employeeAnalysis === "boolean")
      return user.tierLimits.employeeAnalysis;
    return false;
  }, [user]);

  useIdleTimeout();

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BookingSkeleton />
      </div>
    );
  }

  return (
    <Suspense fallback={<BookingSkeleton />}>
      <Routes>
        {!state.isAuthenticated ? (
          <>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  {userRole === "owner" ? (
                    <>
                      <Route path="/owner" element={<OwnerPage />} />
                      <Route
                        path="/owner/reports"
                        element={<AgencyReportsList />}
                      />
                      <Route
                        path="/owner/reports/:adminId"
                        element={<AgencyDetailedReport />}
                      />
                      <Route path="/tiers" element={<TiersPage />} />
                      <Route
                        path="/account-settings"
                        element={<AccountSettings />}
                      />
                      <Route
                        path="*"
                        element={<Navigate to="/owner" replace />}
                      />
                    </>
                  ) : (
                    <>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/programs" element={<Programs />} />
                      <Route
                        path="/room-management"
                        element={<RoomManagementPage />}
                      />
                      <Route
                        path="/room-management/program/:programId"
                        element={<RoomManage />}
                      />
                      {hasDailyServiceAccess && (
                        <>
                          <Route
                            path="/daily-services"
                            element={<DailyServices />}
                          />
                          <Route
                            path="/daily-services-report"
                            element={<DailyServiceReport />}
                          />
                        </>
                      )}
                      <Route
                        path="/facturation"
                        element={
                          hasInvoicingAccess ? (
                            <Facturation />
                          ) : (
                            <Navigate to="/dashboard" replace />
                          )
                        }
                      />

                      {/* Managers and Admins Routes */}
                      {(userRole === "admin" || userRole === "manager") && (
                        <>
                          <Route
                            path="/program-pricing"
                            element={<ProgramPricing />}
                          />
                          <Route path="/expenses" element={<Expenses />} />
                          {/* --- NEW: Suppliers Routes --- */}
                          <Route path="/suppliers" element={<Suppliers />} />
                          <Route
                            path="/suppliers/:id"
                            element={<SupplierAnalysis />}
                          />
                        </>
                      )}

                      <Route path="/booking" element={<Booking />} />
                      <Route
                        path="/booking/program/:programId"
                        element={<BookingPage />}
                      />

                      {/* Admin Only Routes */}
                      {userRole === "admin" && (
                        <>
                          <Route
                            path="/profit-report"
                            element={
                              hasProfitReportAccess ? (
                                <ProfitReport />
                              ) : (
                                <Navigate to="/dashboard" replace />
                              )
                            }
                          />
                          <Route
                            path="/program-costing"
                            element={
                              hasProgramCostAccess ? (
                                <ProgramCostingList />
                              ) : (
                                <Navigate to="/dashboard" replace />
                              )
                            }
                          />
                          <Route
                            path="/program-costing/:programId"
                            element={
                              hasProgramCostAccess ? (
                                <ProgramCosting />
                              ) : (
                                <Navigate to="/dashboard" replace />
                              )
                            }
                          />
                          <Route
                            path="/employees"
                            element={<EmployeesPage />}
                          />
                          <Route
                            path="/employees/:username"
                            element={
                              hasEmployeeAnalysisAccess ? (
                                <EmployeeAnalysisPage />
                              ) : (
                                <Navigate to="/employees" replace />
                              )
                            }
                          />
                          <Route path="/settings" element={<Settings />} />
                        </>
                      )}

                      <Route
                        path="/account-settings"
                        element={<AccountSettings />}
                      />
                      <Route
                        path="*"
                        element={<Navigate to="/dashboard" replace />}
                      />
                    </>
                  )}
                </Routes>
              </Layout>
            }
          />
        )}
      </Routes>
    </Suspense>
  );
}

function App() {
  // --- Handle Direction (RTL/LTR) based on language ---
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const dir = lng === "ar" ? "rtl" : "ltr";
      document.documentElement.dir = dir;
      document.documentElement.lang = lng;
    };

    // Set initial direction
    handleLanguageChange(i18n.language);

    // Listen for changes
    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    // Clear user data from storage on refresh/init if desired policy
    // Or remove this if you want persistence across refreshes
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <Router>
              <AppRoutes />
            </Router>
          </ErrorBoundary>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;
