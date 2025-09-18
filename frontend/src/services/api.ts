// frontend/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export interface BookingFilters {
  programId: string;
  searchTerm: string;
  statusFilter: string;
  employeeFilter: string;
}

// --- Auth API ---
export const login = async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include", // Send cookies with the login request
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
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  } as Record<string, string>;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // Include cookies in all API requests
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

export const logout = () => request("/auth/logout", { method: "POST" });

// --- Settings API ---
export const getSettings = () => request("/settings");
export const updateSettings = (settings: any) =>
  request("/settings", { method: "PUT", body: JSON.stringify(settings) });

// --- Facturation API ---
export const getFactures = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return request(`/facturation?${params.toString()}`);
};
export const createFacture = (facture: any) =>
  request("/facturation", { method: "POST", body: JSON.stringify(facture) });
export const updateFacture = (id: number, facture: any) =>
  request(`/facturation/${id}`, {
    method: "PUT",
    body: JSON.stringify(facture),
  });
export const deleteFacture = (id: number) =>
  request(`/facturation/${id}`, { method: "DELETE" });

// --- Daily Service API ---
export const getDailyServices = (page = 1, limit = 10) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return request(`/daily-services?${params.toString()}`);
};
export const createDailyService = (service: any) =>
  request("/daily-services", { method: "POST", body: JSON.stringify(service) });
export const updateDailyService = (id: number, service: any) =>
  request(`/daily-services/${id}`, {
    method: "PUT",
    body: JSON.stringify(service),
  });
export const deleteDailyService = (id: number) =>
  request(`/daily-services/${id}`, { method: "DELETE" });
export const getDailyServiceReport = (startDate?: string, endDate?: string) => {
  let endpoint = "/daily-services/report";
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const queryString = params.toString();
  if (queryString) {
    endpoint += `?${queryString}`;
  }
  return request(endpoint);
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

export const getProfitReport = (
  filterType?: string,
  page: number = 1,
  limit: number = 6
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (filterType && filterType !== "all") {
    params.append("programType", filterType);
  }
  return request(`/dashboard/profit-report?${params.toString()}`);
};

// --- Program API ---
export const getPrograms = (
  page = 1,
  limit = 6,
  searchTerm = "",
  filterType = "all",
  view?: "list" | "pricing" | "rooms" | "full" | "costing"
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    searchTerm,
    filterType,
  });
  if (view) {
    params.append("view", view);
  }
  return request(`/programs?${params.toString()}`);
};

export const searchProgramsForBooking = (searchTerm = "", limit = 10) => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    searchTerm,
    filterType: "all",
  });
  return request(`/programs?${params.toString()}`);
};

export const getProgramById = (id: string) => request(`/programs/${id}`);
export const createProgram = (program: any) =>
  request("/programs", { method: "POST", body: JSON.stringify(program) });
export const updateProgram = (id: number, program: any) =>
  request(`/programs/${id}`, { method: "PUT", body: JSON.stringify(program) });
export const deleteProgram = (id: number) =>
  request(`/programs/${id}`, { method: "DELETE" });

// --- Program Pricing API ---
export const getProgramPricing = (page = 1, limit = 10) =>
  request(`/program-pricing?page=${page}&limit=${limit}`);
export const getProgramPricingByProgramId = (programId: string) =>
  request(`/program-pricing/program/${programId}`);
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

// --- Program Costing API ---
export const getProgramCosts = (programId: string) =>
  request(`/program-costs/${programId}`);

export const saveProgramCosts = (programId: string, data: any) =>
  request(`/program-costs/${programId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// --- Booking API ---
export const getBookingsByProgram = (
  programId: string,
  params: {
    page: number;
    limit: number;
    searchTerm: string;
    sortOrder: string;
    statusFilter: string;
    employeeFilter: string;
  }
) => {
  const queryParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    searchTerm: params.searchTerm,
    sortOrder: params.sortOrder,
    statusFilter: params.statusFilter,
    employeeFilter: params.employeeFilter,
  }).toString();
  return request(`/bookings/program/${programId}?${queryParams}`);
};

export const getBookingIdsByProgram = (
  programId: string,
  params: {
    searchTerm: string;
    statusFilter: string;
    employeeFilter: string;
  }
) => {
  const queryParams = new URLSearchParams({
    searchTerm: params.searchTerm,
    statusFilter: params.statusFilter,
    employeeFilter: params.employeeFilter,
  }).toString();
  return request(`/bookings/program/${programId}/ids?${queryParams}`);
};

export const searchBookingsInProgram = async (
  programId: string,
  searchTerm: string
) => {
  if (!searchTerm) return [];
  const params = new URLSearchParams({
    page: "1",
    limit: "20",
    searchTerm,
    sortOrder: "newest",
    statusFilter: "all",
    employeeFilter: "all",
  });
  const result = await request(
    `/bookings/program/${programId}?${params.toString()}`
  );
  return result.data;
};

export const createBooking = (booking: any) =>
  request("/bookings", { method: "POST", body: JSON.stringify(booking) });
export const updateBooking = (id: number, booking: any) =>
  request(`/bookings/${id}`, { method: "PUT", body: JSON.stringify(booking) });
export const deleteBooking = (id: number) =>
  request(`/bookings/${id}`, { method: "DELETE" });
export const deleteMultipleBookings = (data: {
  bookingIds?: number[];
  filters?: BookingFilters;
}) =>
  request(`/bookings`, {
    method: "DELETE",
    body: JSON.stringify(data),
  });

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

export const getEmployeeAnalysis = (username: string) => {
  return request(`/employees/${username}/analysis`);
};

export const getEmployeeProgramPerformance = (
  username: string,
  startDate?: string,
  endDate?: string
) => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const queryString = params.toString();
  let endpoint = `/employees/${username}/program-performance`;
  if (queryString) {
    endpoint += `?${queryString}`;
  }
  return request(endpoint);
};

export const getEmployeeServicePerformance = (
  username: string,
  startDate?: string,
  endDate?: string
) => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  const queryString = params.toString();
  let endpoint = `/employees/${username}/service-performance`;
  if (queryString) {
    endpoint += `?${queryString}`;
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
export const updateAdminUserTier = (id: number, tierId: number) =>
  request(`/owner/admins/${id}/tier`, {
    method: "PUT",
    body: JSON.stringify({ tierId }),
  });
export const updateAdminUserLimits = (id: number, limits: any) =>
  request(`/owner/admins/${id}/limits`, {
    method: "PUT",
    body: JSON.stringify({ limits }),
  });

// --- Tier Management API (New) ---
export const getTiers = () => request("/tiers");
export const createTier = (tierData: any) =>
  request("/tiers", { method: "POST", body: JSON.stringify(tierData) });
export const updateTier = (id: number, tierData: any) =>
  request(`/tiers/${id}`, { method: "PUT", body: JSON.stringify(tierData) });
export const deleteTier = (id: number) =>
  request(`/tiers/${id}`, { method: "DELETE" });

// --- Export/Import API ---
export const exportBookingsToExcel = (programId: string) =>
  request(`/bookings/export-excel/program/${programId}`, {}, true);

export const exportFlightListToExcel = (programId: string) =>
  request(`/bookings/export-flight-list/program/${programId}`, {}, true);

export const exportBookingTemplateForProgram = (programId: string) =>
  request(`/bookings/export-template/program/${programId}`, {}, true);

export const importBookings = (file: File, programId: string) => {
  const formData = new FormData();
  formData.append("file", file);
  // The 'request' helper handles credentials, so we don't need token logic here.
  return fetch(`${API_BASE_URL}/bookings/import-excel/program/${programId}`, {
    method: "POST",
    body: formData,
    credentials: "include", // Ensure cookie is sent with FormData request
  }).then(async (res) => {
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Import failed");
    }
    return res.json();
  });
};

// --- Room Management API ---
export const getRooms = (programId: string, hotelName: string) =>
  request(`/room-management/program/${programId}/hotel/${hotelName}`);

export const saveRooms = (programId: string, hotelName: string, rooms: any) =>
  request(`/room-management/program/${programId}/hotel/${hotelName}`, {
    method: "POST",
    body: JSON.stringify({ rooms }),
  });

export const searchUnassignedOccupants = (
  programId: string,
  hotelName: string,
  searchTerm: string
) => {
  const params = new URLSearchParams({ searchTerm });
  return request(
    `/room-management/program/${programId}/hotel/${hotelName}/search-unassigned?${params.toString()}`
  );
};

export const exportRoomAssignmentsToExcel = (programId: string) =>
  request(`/room-management/program/${programId}/export-excel`, {}, true);
