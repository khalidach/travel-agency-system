import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './services/i18n';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Programs from './pages/Programs';
import Booking from './pages/Booking';
import ProfitReport from './pages/ProfitReport';
import { AppProvider } from './context/AppContext';

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AppProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/programs" element={<Programs />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/profit-report" element={<ProfitReport />} />
            </Routes>
          </Layout>
        </Router>
      </AppProvider>
    </I18nextProvider>
  );
}

export default App;