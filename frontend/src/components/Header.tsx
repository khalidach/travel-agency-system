import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { Globe, User } from 'lucide-react';

export default function Header() {
  const { t, i18n } = useTranslation();
  const { dispatch } = useAppContext();

  const changeLanguage = (lang: 'en' | 'ar' | 'fr') => {
    i18n.changeLanguage(lang);
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('dashboard')}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Welcome back to your travel management dashboard
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Selector */}
            <div className="relative">
              <div className="flex items-center space-x-1 bg-gray-50 rounded-lg p-1">
                <button
                  onClick={() => changeLanguage('en')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === 'en'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => changeLanguage('ar')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === 'ar'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => changeLanguage('fr')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    i18n.language === 'fr'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  FR
                </button>
              </div>
            </div>

            {/* Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}