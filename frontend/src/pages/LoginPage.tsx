import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plane,
  Lock,
  User,
  Eye,
  EyeOff,
  Globe,
  Sun,
  Moon,
  Check,
  TrendingUp,
  FileText,
  Compass,
  Sparkles
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuthContext } from "../context/AuthContext";
import * as api from "../services/api";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "../context/ThemeContext";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { dispatch } = useAuthContext();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const { mutate: loginUser, isPending } = useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      api.login(credentials.username, credentials.password),
    onSuccess: (userData) => {
      dispatch({ type: "LOGIN", payload: userData });
      toast.success(t("auth.loginSuccess"));
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : t("auth.loginError");
      toast.error(errorMessage);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      toast.error(t("auth.enterAllFields"));
      return;
    }
    loginUser({ username: trimmedUsername, password });
  };

  const changeLanguage = (lang: "en" | "ar" | "fr") => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  // Automated feature carousel rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slides = [
    {
      title: "Hajj & Umrah Management",
      subtitle: "Custom Tailored Workflows",
      description: "Manage flight groups, ticket variations, rooming allocations, and bulk passenger rosters seamlessly in a multi-lingual system.",
      icon: <Compass className="w-6 h-6 text-blue-400" />,
      graphic: (
        <div className="p-5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Rooming List</span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full">Umrah 2026</span>
          </div>
          <div className="space-y-2">
            <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/50 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                <span className="font-semibold text-slate-300">Quad Room - A101</span>
              </div>
              <span className="text-slate-500">4 / 4 Occupants</span>
            </div>
            <div className="p-2.5 bg-slate-950/50 rounded-xl border border-slate-800/50 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                <span className="font-semibold text-slate-300">Triple Room - A102</span>
              </div>
              <span className="text-slate-500">2 / 3 Occupants</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Total Allocated Seats</span>
              <span className="font-semibold text-slate-200">84% Filled</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-[84%] h-full bg-blue-500 rounded-full"></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Real-time Profit Intelligence",
      subtitle: "Maximize Your Margins",
      description: "Instantly analyze gross revenue vs exact base costs. Visual breakdowns of Hajj, Umrah, Tourism, and Daily Services margins.",
      icon: <TrendingUp className="w-6 h-6 text-indigo-400" />,
      graphic: (
        <div className="p-5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profit Margin Analysis</span>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold rounded-full">Monthly View</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-slate-400">Total Bookings Sales</p>
              <p className="text-sm font-bold text-slate-200 mt-0.5">384,500 DH</p>
            </div>
            <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50">
              <p className="text-[10px] text-slate-400">Net Profit Margin</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">+18.4%</p>
            </div>
          </div>
          <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Umrah Program Margin</span>
              <span className="font-semibold text-emerald-400">+24,200 DH</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-[65%] h-full bg-emerald-500 rounded-full"></div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Slick Invoicing & Custom Quotes",
      subtitle: "Instant Financial Documents",
      description: "Draft invoices or client receipts in seconds. Automatic Moroccan VAT calculations, invoice tracking, and one-click PDF downloading.",
      icon: <FileText className="w-6 h-6 text-violet-400" />,
      graphic: (
        <div className="p-5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl space-y-3.5">
          <div className="flex justify-between items-center border-b border-slate-800/50 pb-2.5">
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-300">INV-2026-0042</span>
            </div>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold rounded-full">Draft</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            <div className="flex justify-between border-b border-slate-800/30 pb-1.5">
              <span>Umrah Standard Package (x2)</span>
              <span className="font-semibold text-slate-200">24,000 DH</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/30 pb-1.5">
              <span>Flight Tickets (x2)</span>
              <span className="font-semibold text-slate-200">11,000 DH</span>
            </div>
            <div className="flex justify-between pt-1 font-bold text-slate-200">
              <span className="text-slate-300">Total Invoice (TTC)</span>
              <span className="text-blue-400">35,000 DH</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans">
      {/* LEFT COLUMN: LOGIN FORM PANEL */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-12 md:p-16 bg-white dark:bg-slate-800 shadow-2xl z-10 border-e border-slate-100 dark:border-slate-700/50 transition-colors duration-300">

        {/* Form Header / Brand & Toggles */}
        <div className="flex justify-between items-center w-full">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/20 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
              <Plane className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              TravelPro
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Language Dropdown Selector */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-700/50 rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{i18n.language.toUpperCase()}</span>
              </button>
              <div className="absolute right-0 top-full mt-1.5 w-32 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 py-1">
                {(["en", "fr", "ar"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => changeLanguage(lang)}
                    className={`flex items-center justify-between w-full px-3 py-2 text-xs text-left ${i18n.language === lang
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      }`}
                  >
                    <span>
                      {lang === "en" ? "🇬🇧 English" : lang === "fr" ? "🇫🇷 Français" : "🇲🇦 العربية"}
                    </span>
                    {i18n.language === lang && <Check className="w-3 h-3 text-blue-500" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Dark/Light Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-700/50 rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="my-auto py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t("auth.loginTitle")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
              {t("auth.loginSubtitle")}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Input Container */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t("username")}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("username") as string | undefined}
                  className="w-full ps-11 pe-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50 dark:bg-slate-900/40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>
            </div>

            {/* Password Input Container */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {t("password")}
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("password") as string | undefined}
                  className="w-full ps-11 pe-11 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50 dark:bg-slate-900/40 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 pe-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/15 dark:shadow-none transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{t("auth.loggingIn")}</span>
                </>
              ) : (
                <span>{t("login")}</span>
              )}
            </button>
          </form>

          {/* Redirect to SignUp */}
          {/* <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-8">
            {t("auth.dontHaveAccount")}{" "}
            <Link
              to="/signup"
              className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              {t("signUp")}
            </Link>
          </p> */}
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-400 dark:text-slate-500 flex justify-between items-center">
          <span>© 2026 TravelPro</span>
          <div className="flex gap-4">
            <Link to="#" className="hover:underline hover:text-slate-600 dark:hover:text-slate-300">Terms</Link>
            <Link to="#" className="hover:underline hover:text-slate-600 dark:hover:text-slate-300">Privacy</Link>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: PREMIUM SHOWCASE PANEL */}
      <div className="hidden lg:flex lg:col-span-7 bg-slate-950 text-white relative overflow-hidden flex-col justify-between p-16">

        {/* Animated glowing decorative blobs in background */}
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-gradient-to-br from-blue-600/20 to-indigo-600/30 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-gradient-to-tr from-violet-600/20 to-pink-600/10 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none"></div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }}
        ></div>

        {/* Top bar header inside dark panel */}
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              SAAS Travel Platform
            </span>
          </div>
        </div>

        {/* Slider contents with fade transitions */}
        <div className="relative z-10 my-auto max-w-lg space-y-12">
          {slides.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <div
                key={index}
                className={`transition-all duration-700 ease-in-out ${isActive
                    ? "opacity-100 transform translate-y-0 relative scale-100"
                    : "opacity-0 absolute top-0 -translate-y-4 scale-95 pointer-events-none"
                  }`}
              >
                <div className="space-y-6">
                  {/* Slider Icon Header */}
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl shadow-xl flex items-center justify-center">
                      {slide.icon}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">
                        {slide.subtitle}
                      </span>
                      <h2 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
                        {slide.title}
                      </h2>
                    </div>
                  </div>

                  {/* Slide Description */}
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {slide.description}
                  </p>

                  {/* Mini-mockup graphic */}
                  <div className="pt-4">
                    {slide.graphic}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dot navigation indicator */}
        <div className="flex items-center gap-3 relative z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide ? "w-8 bg-blue-500" : "w-2 bg-slate-700 hover:bg-slate-600"
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

