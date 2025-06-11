import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Booking, Program } from '../context/AppContext';

interface BookingFormProps {
  booking?: Booking | null;
  programs: Program[];
  onSave: (booking: Booking) => void;
  onCancel: () => void;
}

export default function BookingForm({ booking, programs, onSave, onCancel }: BookingFormProps) {
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    clientNameAr: '',
    clientNameFr: '',
    passportNumber: '',
    tripId: '',
    packageId: '',
    selectedHotel: {
      cities: [''],
      hotelNames: [''],
      roomType: 'Double'
    },
    sellingPrice: 0,
    basePrice: 0,
    advancePayments: [],
    remainingBalance: 0,
    isFullyPaid: false,
    profit: 0,
    createdAt: new Date().toISOString().split('T')[0]
  });

  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [availableRoomTypes] = useState(['Single', 'Double', 'Triple', 'Quad']);

  useEffect(() => {
    if (booking) {
      setFormData({
        clientNameAr: booking.clientNameAr,
        clientNameFr: booking.clientNameFr,
        passportNumber: booking.passportNumber,
        tripId: booking.tripId,
        packageId: booking.packageId,
        selectedHotel: booking.selectedHotel,
        sellingPrice: booking.sellingPrice,
        basePrice: booking.basePrice,
        advancePayments: booking.advancePayments,
        remainingBalance: booking.remainingBalance,
        isFullyPaid: booking.isFullyPaid,
        profit: booking.profit,
        createdAt: booking.createdAt
      });

      const program = programs.find(p => p.id === booking.tripId);
      if (program) {
        setSelectedProgram(program);
        const pkg = program.packages[parseInt(booking.packageId)];
        setSelectedPackage(pkg);
      }
    }
  }, [booking, programs]);

  useEffect(() => {
    if (formData.tripId) {
      const program = programs.find(p => p.id === formData.tripId);
      setSelectedProgram(program || null);
      setSelectedPackage(null);
      setFormData(prev => ({ ...prev, packageId: '' }));
    }
  }, [formData.tripId, programs]);

  useEffect(() => {
    if (selectedProgram && formData.packageId) {
      const pkg = selectedProgram.packages[parseInt(formData.packageId)];
      setSelectedPackage(pkg);
    }
  }, [selectedProgram, formData.packageId]);

  useEffect(() => {
    const profit = formData.sellingPrice - formData.basePrice;
    const totalPaid = formData.advancePayments.reduce((sum: number, payment: any) => sum + payment.amount, 0);
    const remaining = Math.max(0, formData.sellingPrice - totalPaid);
    
    setFormData(prev => ({
      ...prev,
      profit,
      remainingBalance: remaining,
      isFullyPaid: remaining === 0
    }));
  }, [formData.sellingPrice, formData.basePrice, formData.advancePayments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const bookingData: Booking = {
      id: booking?.id || '',
      ...formData
    };
    
    onSave(bookingData);
  };

  const handleProgramChange = (programId: string) => {
    setFormData(prev => ({
      ...prev,
      tripId: programId,
      packageId: '',
      selectedHotel: {
        cities: [''],
        hotelNames: [''],
        roomType: 'Double'
      }
    }));
  };

  const handlePackageChange = (packageId: string) => {
    setFormData(prev => ({
      ...prev,
      packageId,
      selectedHotel: {
        cities: [''],
        hotelNames: [''],
        roomType: 'Double'
      }
    }));
  };

  const updateHotelSelection = (cityIndex: number, hotelName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedHotel: {
        ...prev.selectedHotel,
        hotelNames: prev.selectedHotel.hotelNames.map((name, i) => 
          i === cityIndex ? hotelName : name
        )
      }
    }));
  };

  const addCityHotelSelection = () => {
    setFormData(prev => ({
      ...prev,
      selectedHotel: {
        ...prev.selectedHotel,
        cities: [...prev.selectedHotel.cities, ''],
        hotelNames: [...prev.selectedHotel.hotelNames, '']
      }
    }));
  };

  const removeCityHotelSelection = (index: number) => {
    setFormData(prev => ({
      ...prev,
      selectedHotel: {
        ...prev.selectedHotel,
        cities: prev.selectedHotel.cities.filter((_, i) => i !== index),
        hotelNames: prev.selectedHotel.hotelNames.filter((_, i) => i !== index)
      }
    }));
  };

  const updateCitySelection = (cityIndex: number, cityName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedHotel: {
        ...prev.selectedHotel,
        cities: prev.selectedHotel.cities.map((city, i) => 
          i === cityIndex ? cityName : city
        )
      }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Name (French)
          </label>
          <input
            type="text"
            value={formData.clientNameFr}
            onChange={(e) => setFormData(prev => ({ ...prev, clientNameFr: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Name (Arabic)
          </label>
          <input
            type="text"
            value={formData.clientNameAr}
            onChange={(e) => setFormData(prev => ({ ...prev, clientNameAr: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            dir="rtl"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('passportNumber')}
        </label>
        <input
          type="text"
          value={formData.passportNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, passportNumber: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Program Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Travel Program
          </label>
          <select
            value={formData.tripId}
            onChange={(e) => handleProgramChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">Select a program</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Package
          </label>
          <select
            value={formData.packageId}
            onChange={(e) => handlePackageChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={!selectedProgram}
            required
          >
            <option value="">Select a package</option>
            {selectedProgram?.packages.map((pkg, index) => (
              <option key={index} value={index.toString()}>
                {pkg.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hotel Selection by City */}
      {selectedPackage && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Hotel Selection by City
            </label>
            <button
              type="button"
              onClick={addCityHotelSelection}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add City
            </button>
          </div>
          
          <div className="space-y-3">
            {formData.selectedHotel.cities.map((selectedCity, cityIndex) => (
              <div key={cityIndex} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    City
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => updateCitySelection(cityIndex, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select city</option>
                    {selectedProgram?.cities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Hotel
                    </label>
                    <select
                      value={formData.selectedHotel.hotelNames[cityIndex] || ''}
                      onChange={(e) => updateHotelSelection(cityIndex, e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!selectedCity}
                      required
                    >
                      <option value="">Select hotel</option>
                      {selectedCity && selectedPackage.hotels[selectedCity]?.map((hotel: string, hotelIndex: number) => (
                        <option key={hotelIndex} value={hotel}>{hotel}</option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.selectedHotel.cities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCityHotelSelection(cityIndex)}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Room Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Room Type
        </label>
        <select
          value={formData.selectedHotel.roomType}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            selectedHotel: { ...prev.selectedHotel, roomType: e.target.value }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          {availableRoomTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('basePrice')} (MAD)
          </label>
          <input
            type="number"
            value={formData.basePrice}
            onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('sellingPrice')} (MAD)
          </label>
          <input
            type="number"
            value={formData.sellingPrice}
            onChange={(e) => setFormData(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profit (MAD)
          </label>
          <input
            type="number"
            value={formData.profit}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            disabled
          />
        </div>
      </div>

      {/* Booking Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Booking Date
        </label>
        <input
          type="date"
          value={formData.createdAt}
          onChange={(e) => setFormData(prev => ({ ...prev, createdAt: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('save')}
        </button>
      </div>
    </form>
  );
}