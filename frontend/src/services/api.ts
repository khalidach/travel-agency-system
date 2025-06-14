const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper function for API requests
async function request(endpoint: string, options: RequestInit = {}, returnsBlob = false) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Something went wrong');
  }
  
  if (returnsBlob) {
    return response.blob();
  }
  return response.json();
}

// --- Program API ---
export const getPrograms = () => request('/programs');
export const createProgram = (program: any) => request('/programs', { method: 'POST', body: JSON.stringify(program) });
export const updateProgram = (id: string, program: any) => request(`/programs/${id}`, { method: 'PUT', body: JSON.stringify(program) });
export const deleteProgram = (id: string) => request(`/programs/${id}`, { method: 'DELETE' });

// --- Program Pricing API ---
export const getProgramPricing = () => request('/program-pricing');
export const createProgramPricing = (pricing: any) => request('/program-pricing', { method: 'POST', body: JSON.stringify(pricing) });
export const updateProgramPricing = (id: string, pricing: any) => request(`/program-pricing/${id}`, { method: 'PUT', body: JSON.stringify(pricing) });
export const deleteProgramPricing = (id: string) => request(`/program-pricing/${id}`, { method: 'DELETE' });

// --- Booking API ---
export const getBookings = () => request('/bookings');
export const createBooking = (booking: any) => request('/bookings', { method: 'POST', body: JSON.stringify(booking) });
export const updateBooking = (id: string, booking: any) => request(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(booking) });
export const deleteBooking = (id: string) => request(`/bookings/${id}`, { method: 'DELETE' });

// --- Payment API ---
export const addPayment = (bookingId: string, payment: any) => request(`/bookings/${bookingId}/payments`, { method: 'POST', body: JSON.stringify(payment) });
export const updatePayment = (bookingId: string, paymentId: string, payment: any) => request(`/bookings/${bookingId}/payments/${paymentId}`, { method: 'PUT', body: JSON.stringify(payment) });
export const deletePayment = (bookingId: string, paymentId: string) => request(`/bookings/${bookingId}/payments/${paymentId}`, { method: 'DELETE' });

// --- Export API ---
export const exportBookingsToExcel = (programId: string) => 
  request(`/bookings/export-excel/program/${programId}`, {}, true);