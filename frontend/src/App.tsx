import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./services/i18n";
import { Toaster } from "react-hot-toast";
import React, { Suspense, lazy } from "react";

import { AuthProvider, useAuthContext } from "./context/AuthContext";
import Layout from "./components/Layout";
import useIdleTimeout from "./services/useIdleTimeout";
import BookingSkeleton from "./components/skeletons/BookingSkeleton";

// Lazy load the page components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Programs = lazy(() => import("./pages/Programs"));
const Booking = lazy(() => import("./pages/Booking"));
const ProfitReport = lazy(() => import("./pages/ProfitReport"));
const ProgramPricing = lazy(() => import("./pages/ProgramPricing"));
const EmployeesPage = lazy(() => import("./pages/Employees")); // New
const LoginPage = lazy(() => import("./pages/LoginPage"));

// A wrapper component to decide which view to show based on auth state
function AppRoutes() {
  const { state } = useAuthContext();
  const userRole = state.user?.role;

  // Logout user after 1 hour of inactivity
  const IDLE_TIMEOUT = 60 * 60 * 1000;

  // Refresh the session token every 55 minutes to stay ahead of the 1-hour expiration
  const REFRESH_INTERVAL = 55 * 60 * 1000;

  useIdleTimeout(IDLE_TIMEOUT, REFRESH_INTERVAL);

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
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/programs" element={<Programs />} />
                  {(userRole === "admin" || userRole === "manager") && (
                    <Route
                      path="/program-pricing"
                      element={<ProgramPricing />}
                    />
                  )}
                  <Route path="/booking" element={<Booking />} />
                  <Route
                    path="/booking/program/:programId"
                    element={<Booking />}
                  />
                  {userRole === "admin" && (
                    <Route path="/profit-report" element={<ProfitReport />} />
                  )}
                  {userRole === "admin" && (
                    <Route path="/employees" element={<EmployeesPage />} />
                  )}
                  <Route path="*" element={<Navigate to="/" replace />} />
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
