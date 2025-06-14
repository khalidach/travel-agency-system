import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "./services/i18n";
import { Toaster } from "react-hot-toast";

import { AppProvider, useAppContext } from "./context/AppContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Programs from "./pages/Programs";
import Booking from "./pages/Booking";
import ProfitReport from "./pages/ProfitReport";
import ProgramPricing from "./pages/ProgramPricing";
import LoginPage from "./pages/LoginPage";

// A wrapper component to decide which view to show based on auth state
function AppRoutes() {
  const { state } = useAppContext();

  if (state.loading && state.isAuthenticated) {
      return (
          <div className="flex items-center justify-center min-h-screen">
              <div>Loading...</div>
          </div>
      );
  }

  return (
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
                <Route path="/program-pricing" element={<ProgramPricing />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/profit-report" element={<ProfitReport />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          }
        />
      )}
    </Routes>
  );
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AppProvider>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster position="bottom-right" />
      </AppProvider>
    </I18nextProvider>
  );
}

export default App;
