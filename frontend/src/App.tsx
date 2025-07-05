import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./services/i18n";
import { Toaster } from "react-hot-toast";
import React, { Suspense, lazy, useMemo } from "react";

import { AuthProvider, useAuthContext } from "./context/AuthContext";
import Layout from "./components/Layout";
import useIdleTimeout from "./services/useIdleTimeout";
import BookingSkeleton from "./components/skeletons/BookingSkeleton";

// Lazy load the page components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Programs = lazy(() => import("./pages/Programs"));
const Booking = lazy(() => import("./pages/Booking"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const ProfitReport = lazy(() => import("./pages/ProfitReport"));
const ProgramPricing = lazy(() => import("./pages/ProgramPricing"));
const EmployeesPage = lazy(() => import("./pages/Employees"));
const EmployeeAnalysisPage = lazy(() => import("./pages/EmployeeAnalysis"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const OwnerPage = lazy(() => import("./pages/Owner"));
const TiersPage = lazy(() => import("./pages/Tiers")); // New
const RoomManagementPage = lazy(() => import("./pages/RoomManagementPage"));
const RoomManage = lazy(() => import("./pages/RoomManage"));
const Facturation = lazy(() => import("./pages/Facturation")); // New
const Settings = lazy(() => import("./pages/Settings")); // New

// A wrapper component to decide which view to show based on auth state
function AppRoutes() {
  const { state } = useAuthContext();
  const user = state.user;
  const userRole = user?.role;

  const hasInvoicingAccess = useMemo(() => {
    if (!user) return false;
    // 1. Check for a specific custom limit on the user.
    if (typeof user.limits?.invoicing === "boolean") {
      return user.limits.invoicing;
    }
    // 2. Fallback to the limits defined by the user's tier.
    if (typeof user.tierLimits?.invoicing === "boolean") {
      return user.tierLimits.invoicing;
    }
    // 3. A final fallback for older data structures or if tierLimits isn't populated.
    if (user.tierId) {
      return user.tierId !== 1;
    }
    return false; // Default to no access if no information is available.
  }, [user]);

  useIdleTimeout();

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <Suspense fallback={<BookingSkeleton />}>
      <Routes>
        {!state.isAuthenticated ? (
          <>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route
            path="/*"
            element={
              userRole === "owner" ? (
                <Layout>
                  <Routes>
                    <Route path="/" element={<OwnerPage />} />
                    <Route path="/tiers" element={<TiersPage />} />{" "}
                    {/* New Route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              ) : (
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/programs" element={<Programs />} />
                    <Route
                      path="/facturation"
                      element={
                        hasInvoicingAccess ? (
                          <Facturation />
                        ) : (
                          <Navigate to="/" replace />
                        )
                      }
                    />
                    {(userRole === "admin" || userRole === "manager") && (
                      <>
                        <Route
                          path="/program-pricing"
                          element={<ProgramPricing />}
                        />
                        <Route
                          path="/room-management"
                          element={<RoomManagementPage />}
                        />
                        <Route
                          path="/room-management/program/:programId"
                          element={<RoomManage />}
                        />
                      </>
                    )}
                    <Route path="/booking" element={<Booking />} />
                    <Route
                      path="/booking/program/:programId"
                      element={<BookingPage />}
                    />
                    {userRole === "admin" && (
                      <>
                        <Route
                          path="/profit-report"
                          element={<ProfitReport />}
                        />
                        <Route path="/employees" element={<EmployeesPage />} />
                        <Route
                          path="/employees/:username"
                          element={<EmployeeAnalysisPage />}
                        />
                        <Route path="/settings" element={<Settings />} />
                      </>
                    )}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              )
            }
          />
        )}
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </I18nextProvider>
  );
}

export default App;
