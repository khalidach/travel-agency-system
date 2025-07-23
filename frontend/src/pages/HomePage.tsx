// frontend/src/pages/HomePage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Plane, BarChart, DollarSign, Users, TrendingUp } from "lucide-react";
import { useAuthContext } from "../context/AuthContext";

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
  <div className="bg-gray-800 bg-opacity-50 p-4 rounded-lg border border-gray-700 flex items-center">
    <div
      className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${color}`}
    >
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-white text-xl font-bold">{value}</p>
    </div>
  </div>
);

const HomePage = () => {
  const { state } = useAuthContext();
  const navigate = useNavigate();

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

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      {/* Header */}
      <header className="py-4 px-8 flex justify-between items-center border-b border-gray-800">
        <div className="flex items-center">
          <Plane className="w-8 h-8 text-indigo-400" />
          <h1 className="text-2xl font-bold ml-2">TravelPro</h1>
        </div>
        <nav className="hidden md:flex items-center space-x-6">
          <a
            href="#features"
            className="hover:text-indigo-400 transition-colors"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="hover:text-indigo-400 transition-colors"
          >
            Pricing
          </a>
          <a href="#about" className="hover:text-indigo-400 transition-colors">
            About Us
          </a>
          <a
            href="#contact"
            className="hover:text-indigo-400 transition-colors"
          >
            Contact
          </a>
        </nav>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLoginClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {state.isAuthenticated ? "Dashboard" : "Se Connecter"}
          </button>
          <button className="hidden md:block bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            3 Jours d'essai gratuit
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-8 py-16 md:py-24 flex flex-col md:flex-row items-center w-full">
        <div className="md:max-w-[1000px] text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Votre agence de voyage,{" "}
            <span className="text-indigo-400">maîtrisée en un clic.</span>
          </h2>
          <p className="text-gray-400 mt-4 text-lg">
            Planning, paiements, clients – tout est là. Gratuit à l'essai !
          </p>
          <div className="mt-8 flex justify-center md:justify-start space-x-4">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors">
              Commencez Gratuitement
            </button>
            <div className="flex items-center space-x-2">
              <button className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                FR
              </button>
              <button className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                AR
              </button>
              <button className="w-10 h-10 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="md:max-w-[1000px] mt-12 md:mt-0 md:pl-12">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Dashboard</h3>
              <div className="text-sm bg-gray-700 px-3 py-1 rounded-full">
                07-2025
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={TrendingUp}
                title="Total des Bénéfices"
                value="17614 DH"
                color="bg-green-500"
              />
              <StatCard
                icon={DollarSign}
                title="Paiements"
                value="10674 DH"
                color="bg-blue-500"
              />
              <StatCard
                icon={Users}
                title="Ventes"
                value="8940 DH"
                color="bg-purple-500"
              />
              <StatCard
                icon={Plane}
                title="Voyages Actifs"
                value="12"
                color="bg-red-500"
              />
            </div>
            <div className="bg-gray-900 bg-opacity-50 p-4 rounded-lg border border-gray-700">
              <h4 className="text-lg font-semibold mb-2">Aperçu des Profits</h4>
              <div className="h-48 flex items-end">
                {/* Simplified Chart */}
                <div className="w-full flex justify-between items-end h-full px-2">
                  <div
                    className="w-1/12 bg-indigo-500 rounded-t-md"
                    style={{ height: "30%" }}
                  ></div>
                  <div
                    className="w-1/12 bg-indigo-500 rounded-t-md"
                    style={{ height: "50%" }}
                  ></div>
                  <div
                    className="w-1/12 bg-indigo-500 rounded-t-md"
                    style={{ height: "40%" }}
                  ></div>
                  <div
                    className="w-1/12 bg-indigo-500 rounded-t-md"
                    style={{ height: "70%" }}
                  ></div>
                  <div
                    className="w-1/12 bg-indigo-500 rounded-t-md"
                    style={{ height: "60%" }}
                  ></div>
                  <div
                    className="w-1/12 bg-indigo-500 rounded-t-md"
                    style={{ height: "80%" }}
                  ></div>
                  <div
                    className="w-1/12 bg-indigo-500 rounded-t-md"
                    style={{ height: "75%" }}
                  ></div>
                  <div
                    className="w-1/12 bg-indigo-500 rounded-t-md"
                    style={{ height: "90%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
