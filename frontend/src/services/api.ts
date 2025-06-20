const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// --- Auth API ---
export const login = async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Login failed");
  }
  return response.json();
};

// Helper function for authenticated API requests
async function request(
  endpoint: string,
  options: RequestInit = {},
  returnsBlob = false
) {
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  } as Record<string, string>;
  if (user && user.token) {
    headers["Authorization"] = `Bearer ${user.token}`;
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("auth-error"));
    const errorData = await response.json();
    throw new Error(errorData.message || "Something went wrong");
  }
  if (returnsBlob) return response.blob();
  return response.json();
}

// Add this new function
export const refreshToken = async () => {
  return request("/auth/refresh", { method: "POST" });
};

// --- Program API ---
export const getPrograms = (page = 1, limit = 10) =>
  request(`/programs?page=${page}&limit=${limit}`);
export const createProgram = (program: any) =>
  request("/programs", { method: "POST", body: JSON.stringify(program) });
export const updateProgram = (id: number, program: any) =>
  request(`/programs/${id}`, { method: "PUT", body: JSON.stringify(program) });
export const deleteProgram = (id: number) =>
  request(`/programs/${id}`, { method: "DELETE" });

// --- Program Pricing API ---
export const getProgramPricing = (page = 1, limit = 10) =>
  request(`/program-pricing?page=${page}&limit=${limit}`);
export const createProgramPricing = (pricing: any) =>
  request("/program-pricing", {
    method: "POST",
    body: JSON.stringify(pricing),
  });
export const updateProgramPricing = (id: number, pricing: any) =>
  request(`/program-pricing/${id}`, {
    method: "PUT",
    body: JSON.stringify(pricing),
  });
export const deleteProgramPricing = (id: number) =>
  request(`/program-pricing/${id}`, { method: "DELETE" });

// --- Booking API ---
export const getBookings = (page = 1, limit = 10) =>
  request(`/bookings?page=${page}&limit=${limit}`);
export const createBooking = (booking: any) =>
  request("/bookings", { method: "POST", body: JSON.stringify(booking) });
export const updateBooking = (id: number, booking: any) =>
  request(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(booking) });
export const deleteBooking = (id: number) =>
  request(`/bookings/${id}`, { method: "DELETE" });

// --- Payment API ---
export const addPayment = (bookingId: number, payment: any) =>
  request(`/bookings/${bookingId}/payments`, {
    method: "POST",
    body: JSON.stringify(payment),
  });
export const updatePayment = (
  bookingId: number,
  paymentId: string,
  payment: any
) =>
  request(`/bookings/${bookingId}/payments/${paymentId}`, {
    method: "PUT",
    body: JSON.stringify(payment),
  });
export const deletePayment = (bookingId: number, paymentId: string) =>
  request(`/bookings/${bookingId}/payments/${paymentId}`, { method: "DELETE" });

// --- Export/Import API ---
export const exportBookingsToExcel = (programId: string) =>
  request(`/bookings/export-excel/program/${programId}`, {}, true);
export const exportBookingTemplate = () =>
  request(`/bookings/export-template`, {}, true);

export const importBookings = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const headers: Record<string, string> = {};
  if (user && user.token) {
    headers["Authorization"] = `Bearer ${user.token}`;
  }
  return fetch(`${API_BASE_URL}/bookings/import-excel`, {
    method: "POST",
    body: formData,
    headers,
  }).then(async (res) => {
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Import failed");
    }
    return res.json();
  });
};
