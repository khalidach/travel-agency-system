// frontend/src/services/api.ts
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
  // Use sessionStorage to get user data for the current session.
  const userStr = sessionStorage.getItem("user");
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
  if (response.status === 204) return; // For DELETE requests with no content
  return response.json();
}

export const refreshToken = async () => {
  return request("/auth/refresh", { method: "POST" });
};

// --- Dashboard API ---
export const getDashboardStats = (startDate?: string, endDate?: string) => {
  let endpoint = "/dashboard/stats";
  if (startDate && endDate) {
    const params = new URLSearchParams({ startDate, endDate });
    endpoint += `?${params.toString()}`;
  }
  return request(endpoint);
};

export const getProfitReport = (filterType?: string) => {
  let endpoint = "/dashboard/profit-report";
  if (filterType && filterType !== "all") {
    const params = new URLSearchParams({ programType: filterType });
    endpoint += `?${params.toString()}`;
  }
  return request(endpoint);
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
export const getBookingsByProgram = (programId: string) =>
  request(`/bookings/program/${programId}`);
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

// --- Employee API ---
export const getEmployees = () => request("/employees");
export const createEmployee = (employeeData: any) =>
  request("/employees", { method: "POST", body: JSON.stringify(employeeData) });
export const updateEmployee = (id: number, employeeData: any) =>
  request(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(employeeData),
  });
export const deleteEmployee = (id: number) =>
  request(`/employees/${id}`, { method: "DELETE" });

// NEW: API for employee analysis
export const getEmployeeAnalysis = (
  username: string,
  startDate?: string,
  endDate?: string
) => {
  let endpoint = `/employees/${username}/analysis`;
  if (startDate && endDate) {
    const params = new URLSearchParams({ startDate, endDate });
    endpoint += `?${params.toString()}`;
  }
  return request(endpoint);
};

// --- Owner API ---
export const getAdminUsers = () => request("/owner/admins");
export const createAdminUser = (userData: any) =>
  request("/owner/admins", { method: "POST", body: JSON.stringify(userData) });
export const updateAdminUser = (id: number, userData: any) =>
  request(`/owner/admins/${id}`, {
    method: "PUT",
    body: JSON.stringify(userData),
  });
export const toggleAdminUserStatus = (id: number, activeUser: boolean) =>
  request(`/owner/admins/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ activeUser }),
  });
export const deleteAdminUser = (id: number) =>
  request(`/owner/admins/${id}`, { method: "DELETE" });

// --- Export/Import API ---
export const exportBookingsToExcel = (programId: string) =>
  request(`/bookings/export-excel/program/${programId}`, {}, true);

export const exportBookingTemplateForProgram = (programId: string) =>
  request(`/bookings/export-template/program/${programId}`, {}, true);

export const importBookings = (file: File, programId: string) => {
  const formData = new FormData();
  formData.append("file", file);
  const userStr = sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const headers: Record<string, string> = {};
  if (user && user.token) {
    headers["Authorization"] = `Bearer ${user.token}`;
  }
  return fetch(`${API_BASE_URL}/bookings/import-excel/program/${programId}`, {
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
