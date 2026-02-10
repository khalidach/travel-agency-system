// frontend/src/pages/HomePage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane,
  BarChart,
  DollarSign,
  Users,
  TrendingUp,
  Zap,
  Moon,
  Sun,
} from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useTranslation, Trans } from "react-i18next";

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-8 h-8 text-white"
  >
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const StatCard = ({
  icon: Icon,
  title,
  value,
  color,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  color: string;
}) => (
  <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center">
    <div
      className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${color}`}
    >
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
      <p className="text-gray-900 dark:text-white text-xl font-bold">{value}</p>
    </div>
  </div>
);

const FeatureCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <div
    className={`bg-white dark:bg-gray-800/50 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 ${
      document.documentElement.dir === "rtl" ? "text-right" : "text-left"
    }`}
  >
    <div className="flex items-center mb-4">
      <Icon className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
      <h3 className="text-xl font-bold ml-4 text-gray-900 dark:text-white">
        {title}
      </h3>
    </div>
    <p className="text-gray-600 dark:text-gray-400">{children}</p>
  </div>
);

const HomePage = () => {
  const { state } = useAuthContext();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang: "en" | "ar" | "fr") => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  };

  const handleLoginClick = () => {
    if (state.isAuthenticated) {
      if (state.user?.role === "owner") {
        navigate("/owner");
      } else {
        navigate("/dashboard");
      }
    } else {
      navigate("/login");
    }
  };

  const handleSignUpClick = () => {
    navigate("/login");
  };

  return (
    <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-white min-h-screen font-sans overflow-x-hidden">
      <style>{"html { scroll-behavior: smooth; }"}</style>
      {/* Header */}
      <header className="py-4 px-8 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="flex items-center">
          <Plane className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
          <h1 className="text-2xl font-bold ml-2">{t("home.header.brand")}</h1>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-gray-600 dark:text-gray-300">
          <a
            href="#features"
            className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            {t("home.header.features")}
          </a>
          <a
            href="#pricing"
            className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            {t("home.header.pricing")}
          </a>
          <a
            href="#faq"
            className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            {t("home.header.faq")}
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === "light" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleLoginClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {state.isAuthenticated
              ? t("home.header.dashboard")
              : t("home.header.login")}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-8 py-16 md:py-24 flex flex-col md:flex-row items-center w-full">
        <div
          className={`md:w-1/2 text-center ${
            document.documentElement.dir === "rtl"
              ? "md:text-right"
              : "md:text-left"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            <Trans i18nKey="home.hero.title">
              Votre agence de voyage,{" "}
              <span className="text-indigo-500 dark:text-indigo-400">
                maîtrisée en un clic.
              </span>
            </Trans>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-4 text-lg">
            {t("home.hero.subtitle")}
          </p>
          <div className="mt-8 flex justify-center md:justify-start gap-4">
            <button
              onClick={handleSignUpClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
            >
              {t("home.hero.startFree")}
            </button>
            <button
              onClick={handleSignUpClick}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
            >
              {t("home.hero.trial")}
            </button>
          </div>
        </div>
        <div className="md:w-1/2 mt-12 md:mt-0 md:pl-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {t("home.dashboardPreview.title")}
              </h3>
              <div className="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                07-2025
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <StatCard
                icon={TrendingUp}
                title={t("home.dashboardPreview.totalProfit")}
                value="176,140 DH"
                color="bg-green-500"
              />
              <StatCard
                icon={DollarSign}
                title={t("home.dashboardPreview.payments")}
                value="106,740 DH"
                color="bg-blue-500"
              />
              <StatCard
                icon={Users}
                title={t("home.dashboardPreview.activeClients")}
                value="89"
                color="bg-purple-500"
              />
              <StatCard
                icon={Plane}
                title={t("home.dashboardPreview.activeTrips")}
                value="12"
                color="bg-red-500"
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold mb-2">
                {t("home.dashboardPreview.profitOverview")}
              </h4>
              <div className="h-48 flex items-end">
                <div className="w-full flex justify-between items-end h-full px-2">
                  {[30, 50, 40, 70, 60, 80, 75, 90, 65, 55, 70, 85].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="w-[4%] bg-indigo-500 rounded-t-md hover:bg-indigo-400 transition-colors"
                        style={{ height: `${h}%` }}
                      ></div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("home.featuresSection.title")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12">
            {t("home.featuresSection.subtitle")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={BarChart}
              title={t("home.featuresSection.intuitiveDashboard.title")}
            >
              {t("home.featuresSection.intuitiveDashboard.description")}
            </FeatureCard>
            <FeatureCard
              icon={Plane}
              title={t("home.featuresSection.programManagement.title")}
            >
              {t("home.featuresSection.programManagement.description")}
            </FeatureCard>
            <FeatureCard
              icon={Users}
              title={t("home.featuresSection.clientTracking.title")}
            >
              {t("home.featuresSection.clientTracking.description")}
            </FeatureCard>
            <FeatureCard
              icon={DollarSign}
              title={t("home.featuresSection.simplifiedBilling.title")}
            >
              {t("home.featuresSection.simplifiedBilling.description")}
            </FeatureCard>
            <FeatureCard
              icon={TrendingUp}
              title={t("home.featuresSection.profitabilityReports.title")}
            >
              {t("home.featuresSection.profitabilityReports.description")}
            </FeatureCard>
            <FeatureCard
              icon={Zap}
              title={t("home.featuresSection.dailyServices.title")}
            >
              {t("home.featuresSection.dailyServices.description")}
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* Pricing Section (Contact Support) */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("home.pricingSection.title")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12">
            {t("home.pricingSection.subtitle")}
          </p>

          <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 md:p-12 rounded-2xl border border-indigo-500/30 shadow-2xl flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-6">
              <DollarSign className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>

            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {t("home.pricingSection.contactTitle", "Get a Custom Quote")}
            </h3>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl">
              {t(
                "home.pricingSection.contactDescription",
                "Contact our support team to discuss your agency's specific needs and get a pricing plan tailored for you.",
              )}
            </p>

            <a
              href="https://wa.me/212782622161"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/30"
            >
              <WhatsAppIcon />
              <span>
                {t(
                  "home.pricingSection.contactSupport",
                  "Contact Support via WhatsApp",
                )}
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-8 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t("home.faqSection.title")}
          </h2>
          <div className="gap-6">
            <details className="bg-white dark:bg-gray-800 p-6 rounded-lg group">
              <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                <span>{t("home.faqSection.q1")}</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p
                className={`text-gray-600 dark:text-gray-400 mt-4 ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("home.faqSection.a1")}
              </p>
            </details>
            <details className="bg-white dark:bg-gray-800 p-6 rounded-lg group">
              <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                <span>{t("home.faqSection.q2")}</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p
                className={`text-gray-600 dark:text-gray-400 mt-4 ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("home.faqSection.a2")}
              </p>
            </details>
            <details className="bg-white dark:bg-gray-800 p-6 rounded-lg group">
              <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                <span>{t("home.faqSection.q3")}</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p
                className={`text-gray-600 dark:text-gray-400 mt-4 ${
                  document.documentElement.dir === "rtl"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                {t("home.faqSection.a3")}
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="container mx-auto px-8 py-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center">
            <Plane className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xl font-bold ml-2">
              {t("home.header.brand")}
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-500 mt-4 md:mt-0">
            {t("home.footer.rights")}
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a
              href="#"
              className="text-gray-500 dark:text-gray-500 hover:text-black dark:hover:text-white"
            >
              {t("home.footer.terms")}
            </a>
            <a
              href="#"
              className="text-gray-500 dark:text-gray-500 hover:text-black dark:hover:text-white"
            >
              {t("home.footer.privacy")}
            </a>
          </div>
        </div>
      </footer>

      {/* Language Switcher */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-x-1 bg-gray-700/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-600/50 dark:border-gray-700/50 rounded-full p-1 shadow-lg">
        <button
          onClick={() => changeLanguage("fr")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
            i18n.language === "fr"
              ? "bg-indigo-600 text-white"
              : "text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          FR
        </button>
        <button
          onClick={() => changeLanguage("ar")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
            i18n.language === "ar"
              ? "bg-indigo-600 text-white"
              : "text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          AR
        </button>
        <button
          onClick={() => changeLanguage("en")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
            i18n.language === "en"
              ? "bg-indigo-600 text-white"
              : "text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          EN
        </button>
      </div>

      {/* WhatsApp Floating Icon */}
      <a
        href="https://wa.me/212782622161"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 group"
        aria-label="Contact us on WhatsApp"
      >
        <WhatsAppIcon />
        <span className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-auto min-w-max p-2 text-xs text-white bg-gray-800 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
          {t("home.whatsappTooltip")}
        </span>
      </a>
    </div>
  );
};

export default HomePage;
