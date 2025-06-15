const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// --- Auth API ---
export const login = async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Login failed');
  }

  return response.json();
};


// Helper function for authenticated API requests
async function request(endpoint: string, options: RequestInit = {}, returnsBlob = false) {
  // Retrieve user data from local storage to get the token
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  } as Record<string, string>;

  if (user && user.token) {
    headers['Authorization'] = `Bearer ${user.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // If unauthorized, dispatch a logout event or redirect to login
      // For simplicity, we'll let the AppContext handle this via the error
      window.dispatchEvent(new Event('auth-error'));
    }
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

// --- Export/Import API ---
export const exportBookingsToExcel = (programId: string) => 
  request(`/bookings/export-excel/program/${programId}`, {}, true);

export const exportBookingTemplate = () => 
  request(`/bookings/export-template`, {}, true);

export const importBookings = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Note: We don't set Content-Type header for multipart/form-data.
  // The browser will set it automatically with the correct boundary.
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const headers: Record<string, string> = {};
  if (user && user.token) {
    headers['Authorization'] = `Bearer ${user.token}`;
  }

  return fetch(`${API_BASE_URL}/bookings/import-excel`, {
    method: 'POST',
    body: formData,
    headers,
  }).then(async (res) => {
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Import failed');
    }
    return res.json();
  });
};