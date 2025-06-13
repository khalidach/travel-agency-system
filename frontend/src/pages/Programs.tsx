import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { Plus, Edit2, Trash2, MapPin, Calendar, Users } from 'lucide-react';
import Modal from '../components/Modal';
import ProgramForm from '../components/ProgramForm';
import type { Program } from '../context/AppContext';

export default function Programs() {
  const { t } = useTranslation();
  const { state, dispatch } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredPrograms = state.programs.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || program.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddProgram = () => {
    setEditingProgram(null);
    setIsModalOpen(true);
  };

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program);
    setIsModalOpen(true);
  };

  const handleDeleteProgram = (programId: string) => {
    if (window.confirm('Are you sure you want to delete this program?')) {
      dispatch({ type: 'DELETE_PROGRAM', payload: programId });
    }
  };

  const handleSaveProgram = (program: Program) => {
    if (editingProgram) {
      dispatch({ type: 'UPDATE_PROGRAM', payload: program });
    } else {
      dispatch({ type: 'ADD_PROGRAM', payload: { ...program, id: Date.now().toString() } });
    }
    setIsModalOpen(false);
    setEditingProgram(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Hajj': return 'bg-blue-100 text-blue-700';
      case 'Umrah': return 'bg-emerald-100 text-emerald-700';
      case 'Tourism': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('programs')}</h1>
          <p className="text-gray-600 mt-2">Manage your travel programs and packages</p>
        </div>
        <button
          onClick={handleAddProgram}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('addProgram')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={`${t('search')} programs...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="Hajj">Hajj</option>
            <option value="Umrah">Umrah</option>
            <option value="Tourism">Tourism</option>
          </select>
        </div>
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms.map((program) => (
          <div key={program.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{program.name}</h3>
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-2 ${getTypeColor(program.type)}`}>
                  {program.type}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditProgram(program)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProgram(program.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{program.duration} days</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                <span>{program.cities.map(city => city.name).join(', ')}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Users className="w-4 h-4 mr-2" />
                <span>{program.packages.length} package{program.packages.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap gap-2">
                {program.packages.map((pkg, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                    {pkg.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPrograms.length === 0 && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No programs found</h3>
          <p className="text-gray-500 mb-6">Get started by creating your first travel program.</p>
          <button
            onClick={handleAddProgram}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('addProgram')}
          </button>
        </div>
      )}

      {/* Program Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProgram(null);
        }}
        title={editingProgram ? t('editProgram') : t('addProgram')}
        size="xl"
      >
        <ProgramForm
          program={editingProgram}
          onSave={handleSaveProgram}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingProgram(null);
          }}
        />
      </Modal>
    </div>
  );
}