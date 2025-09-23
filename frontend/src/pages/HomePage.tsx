// frontend/src/pages/HomePage.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane,
  BarChart,
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useAuthContext } from "../context/AuthContext";

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

const FeatureCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg border border-gray-700 hover:border-indigo-500 hover:bg-gray-700 transition-all duration-300 text-left">
    <div className="flex items-center mb-4">
      <Icon className="w-8 h-8 text-indigo-400" />
      <h3 className="text-xl font-bold ml-4">{title}</h3>
    </div>
    <p className="text-gray-400">{children}</p>
  </div>
);

const PricingCard = ({ plan, popular }: { plan: any; popular?: boolean }) => {
  const navigate = useNavigate();
  const { state } = useAuthContext();
  const handleChoosePlan = () => {
    if (state.isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div
      className={`relative bg-gray-800 p-8 rounded-2xl border ${
        popular ? "border-indigo-500" : "border-gray-700"
      }`}
    >
      {popular && (
        <div className="absolute top-0 -translate-y-1/2 bg-indigo-500 text-white text-sm font-semibold px-4 py-1 rounded-full">
          Le plus populaire
        </div>
      )}
      <h3 className="text-2xl font-bold">{plan.title}</h3>
      <p className="text-gray-400 mt-2">{plan.subtitle}</p>
      <div className="mt-6">
        <span className="text-5xl font-extrabold">{plan.price}</span>
        <span className="text-gray-400"> DH/mois</span>
      </div>
      <ul className="mt-8 space-y-4 text-left">
        {plan.features.map((feature: string, index: number) => (
          <li key={index} className="flex items-center">
            <CheckCircle2 className="w-5 h-5 text-green-400 mr-3" />
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={handleChoosePlan}
        className={`w-full mt-10 py-3 px-6 rounded-lg font-semibold transition-colors ${
          popular
            ? "bg-indigo-600 hover:bg-indigo-700 text-white"
            : "bg-gray-700 hover:bg-gray-600 text-white"
        }`}
      >
        Choisir ce plan
      </button>
    </div>
  );
};

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

  const handleSignUpClick = () => {
    navigate("/signup");
  };

  const pricingPlans = {
    monthly: [
      {
        title: "Plan Essentiel",
        subtitle: "Idéal pour les petites agences",
        price: "200",
        features: [
          "2 employés",
          "Jusqu'à 100 réservations/mois",
          "Jusqu'à 5 programmes/mois",
          "Gestion de l'hébergement",
          "Jusqu'à 20 factures/mois",
          "5 exportations par programme/mois",
        ],
      },
      {
        title: "Plan Professionnel",
        subtitle: "Pour les agences en croissance",
        price: "600",
        features: [
          "5 employés",
          "Jusqu'à 500 réservations/mois",
          "Jusqu'à 15 programmes/mois",
          "Calcul des coûts de programme",
          "Gestion de l'hébergement",
          "Jusqu'à 100 factures/mois",
          "Services journaliers (jusqu'à 50/mois)",
          "Exportations illimitées",
        ],
      },
      {
        title: "Plan Élite",
        subtitle: "La solution complète pour les grandes agences",
        price: "1200",
        features: [
          "10 employés",
          "Tout est illimité",
          "Accès prioritaire aux nouvelles fonctionnalités",
        ],
      },
    ],
  };

  return (
    <div
      className="bg-gray-900 text-white min-h-screen font-sans overflow-x-hidden"
      dir="ltr"
    >
      <style>{"html { scroll-behavior: smooth; }"}</style>
      {/* Header */}
      <header className="py-4 px-8 flex justify-between items-center border-b border-gray-800 sticky top-0 z-50 bg-gray-900 bg-opacity-80 backdrop-blur-md">
        <div className="flex items-center">
          <Plane className="w-8 h-8 text-indigo-400" />
          <h1 className="text-2xl font-bold ml-2">TravelPro</h1>
        </div>
        <nav className="hidden md:flex items-center space-x-6">
          <a
            href="#features"
            className="hover:text-indigo-400 transition-colors"
          >
            Fonctionnalités
          </a>
          <a
            href="#pricing"
            className="hover:text-indigo-400 transition-colors"
          >
            Tarifs
          </a>
          <a href="#faq" className="hover:text-indigo-400 transition-colors">
            FAQ
          </a>
        </nav>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleLoginClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {state.isAuthenticated ? "Tableau de bord" : "Se Connecter"}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-8 py-16 md:py-24 flex flex-col md:flex-row items-center w-full">
        <div className="md:w-1/2 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">
            Votre agence de voyage,{" "}
            <span className="text-indigo-400">maîtrisée en un clic.</span>
          </h2>
          <p className="text-gray-400 mt-4 text-lg">
            Planning, paiements, clients – tout est là. Essayez gratuitement !
          </p>
          <div className="mt-8 flex justify-center md:justify-start space-x-4">
            <button
              onClick={handleSignUpClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
            >
              Commencez Gratuitement
            </button>
            <button
              onClick={handleSignUpClick}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors"
            >
              3 Jours d'essai gratuit
            </button>
          </div>
        </div>
        <div className="md:w-1/2 mt-12 md:mt-0 md:pl-12">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Tableau de bord</h3>
              <div className="text-sm bg-gray-700 px-3 py-1 rounded-full">
                07-2025
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <StatCard
                icon={TrendingUp}
                title="Total des Bénéfices"
                value="176,140 DH"
                color="bg-green-500"
              />
              <StatCard
                icon={DollarSign}
                title="Paiements"
                value="106,740 DH"
                color="bg-blue-500"
              />
              <StatCard
                icon={Users}
                title="Clients Actifs"
                value="89"
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
                <div className="w-full flex justify-between items-end h-full px-2">
                  {[30, 50, 40, 70, 60, 80, 75, 90, 65, 55, 70, 85].map(
                    (h, i) => (
                      <div
                        key={i}
                        className="w-[4%] bg-indigo-500 rounded-t-md hover:bg-indigo-400 transition-colors"
                        style={{ height: `${h}%` }}
                      ></div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-900">
        <div className="container mx-auto px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Conçu pour la performance
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-12">
            Tout ce dont votre agence a besoin pour optimiser ses opérations, de
            la réservation à la facturation, en passant par l'analyse des
            profits.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard icon={BarChart} title="Tableau de Bord Intuitif">
              Visualisez vos revenus, vos réservations et vos profits en temps
              réel. Prenez des décisions éclairées grâce à des données claires.
            </FeatureCard>
            <FeatureCard icon={Plane} title="Gestion de Programmes">
              Créez et personnalisez facilement des programmes de voyage, qu'il
              s'agisse de Hajj, Omra ou de tourisme, avec une tarification
              flexible.
            </FeatureCard>
            <FeatureCard icon={Users} title="Suivi des Clients">
              Centralisez toutes les informations de vos clients, gérez les
              paiements et suivez les soldes restants sans effort.
            </FeatureCard>
            <FeatureCard icon={DollarSign} title="Facturation Simplifiée">
              Générez des factures et des devis professionnels en quelques
              clics, personnalisés avec les informations de votre agence.
            </FeatureCard>
            <FeatureCard icon={TrendingUp} title="Rapports de Rentabilité">
              Analysez la performance de chaque programme et service pour
              identifier vos offres les plus rentables et optimiser vos marges.
            </FeatureCard>
            <FeatureCard icon={Zap} title="Services Journaliers">
              Gérez facilement les services additionnels comme les visas, les
              billets d'avion ou les réservations d'hôtel pour augmenter vos
              revenus.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Un tarif simple et transparent
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-12">
            Choisissez le plan qui correspond à la taille et aux ambitions de
            votre agence. Pas de frais cachés.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard plan={pricingPlans.monthly[0]} />
            <PricingCard plan={pricingPlans.monthly[1]} popular />
            <PricingCard plan={pricingPlans.monthly[2]} />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-900">
        <div className="container mx-auto px-8 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Questions Fréquemment Posées
          </h2>
          <div className="space-y-6">
            <details className="bg-gray-800 p-6 rounded-lg group">
              <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                <span>Est-ce que je peux changer de plan plus tard ?</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-400 mt-4 text-left">
                Oui, absolument. Vous pouvez faire évoluer votre abonnement vers
                un plan supérieur à tout moment en nous contactant pour accéder
                à plus de fonctionnalités et des limites plus élevées.
              </p>
            </details>
            <details className="bg-gray-800 p-6 rounded-lg group">
              <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                <span>La période d'essai est-elle vraiment gratuite ?</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-400 mt-4 text-left">
                Oui, l'essai de 3 jours est 100% gratuit et sans engagement.
                Vous n'avez pas besoin de fournir de carte de crédit pour
                commencer. Explorez toutes les fonctionnalités et voyez comment
                TravelPro peut transformer votre agence.
              </p>
            </details>
            <details className="bg-gray-800 p-6 rounded-lg group">
              <summary className="font-semibold text-lg cursor-pointer flex justify-between items-center">
                <span>Mes données sont-elles en sécurité ?</span>
                <span className="transform group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="text-gray-400 mt-4 text-left">
                La sécurité de vos données est notre priorité absolue. Nous
                utilisons des protocoles de cryptage de pointe et des serveurs
                sécurisés pour garantir que les informations de votre agence et
                de vos clients sont protégées en permanence.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="container mx-auto px-8 py-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center">
            <Plane className="w-6 h-6 text-indigo-400" />
            <span className="text-xl font-bold ml-2">TravelPro</span>
          </div>
          <p className="text-gray-500 mt-4 md:mt-0">
            &copy; 2025 TravelPro. Tous droits réservés.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-500 hover:text-white">
              Conditions
            </a>
            <a href="#" className="text-gray-500 hover:text-white">
              Confidentialité
            </a>
          </div>
        </div>
      </footer>

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
          Contactez-nous sur WhatsApp
        </span>
      </a>
    </div>
  );
};

export default HomePage;
