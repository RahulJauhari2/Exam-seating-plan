// API Client for Express + MongoDB + Zod backend

// Use relative /api path — works on Vercel (serverless) and locally (Vite proxy → localhost:5000)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Auth token helpers
export const getAuthToken = () => localStorage.getItem('exam_auth_token') || '';
export const setAuthToken = (token) => {
  if (token) localStorage.setItem('exam_auth_token', token);
  else localStorage.removeItem('exam_auth_token');
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('exam_auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const setStoredUser = (user) => {
  if (user) localStorage.setItem('exam_auth_user', JSON.stringify(user));
  else localStorage.removeItem('exam_auth_user');
};

export const clearAuth = () => {
  localStorage.removeItem('exam_auth_token');
  localStorage.removeItem('exam_auth_user');
};

/**
 * Check if the Express server and MongoDB are online
 */
export async function checkServerHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return {
      status: 'offline',
      database: { connected: false, message: error.message },
    };
  }
}

/**
 * Save complete Exam Session to MongoDB with Zod validation
 */
export async function saveExamSessionToDB(sessionData) {
  try {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        message: data.message || 'त्रुटि (Error saving session)',
        errors: data.errors || [],
      };
    }

    return {
      success: true,
      message: data.message,
      data: data.data,
    };
  } catch (error) {
    return {
      success: false,
      message: `सर्वर से संपर्क नहीं हो सका: ${error.message}`,
      errors: [],
    };
  }
}

/**
 * Fetch all saved sessions list from MongoDB
 */
export async function fetchSessionsListFromDB() {
  try {
    const res = await fetch(`${API_BASE_URL}/sessions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

/**
 * Load a specific session from MongoDB
 */
export async function loadExamSessionFromDB(sessionName, shift = 'shift_1') {
  try {
    const res = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionName)}?shift=${shift}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data;
  } catch (error) {
    return {
      success: false,
      message: `लोड करने में त्रुटि: ${error.message}`,
    };
  }
}

/**
 * Delete a session from MongoDB
 */
export async function deleteExamSessionFromDB(sessionName, shift = 'shift_1') {
  try {
    const res = await fetch(`${API_BASE_URL}/sessions/${encodeURIComponent(sessionName)}?shift=${shift}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Save marks specifically to MongoDB
 */
export async function saveMarksToDB(sessionName, shift, marksData) {
  try {
    const res = await fetch(`${API_BASE_URL}/marks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionName, activeShift: shift, marksData }),
    });
    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Save Duty Roster specifically to MongoDB
 */
export async function saveDutyRosterToDB(sessionName, shift, dutyRoster) {
  try {
    const res = await fetch(`${API_BASE_URL}/duty-roster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionName, activeShift: shift, dutyRoster }),
    });
    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
}

// ----------------------------------------------------------------------
// RBAC Auth APIs
// ----------------------------------------------------------------------

/**
 * Login user (Phone + PIN OR Username + Password)
 */
export async function loginUserAPI(credentials) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (res.ok && data.success && data.token) {
      setAuthToken(data.token);
      setStoredUser(data.user);
    }
    return data;
  } catch (error) {
    return { success: false, message: `लॉगिन नेटवर्क त्रुटि: ${error.message}` };
  }
}

/**
 * Get current authenticated user profile
 */
export async function fetchCurrentUserAPI() {
  const token = getAuthToken();
  if (!token) return { success: false, message: 'टोकन मौजूद नहीं है।' };

  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetch all registered users (Admin & Principal)
 */
export async function fetchUsersListAPI() {
  const token = getAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message, data: [] };
  }
}

/**
 * Update user role / permissions (Principal & SuperAdmin)
 */
export async function updateUserRoleAPI(userId, updates) {
  const token = getAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ----------------------------------------------------------------------
// Live Absentee Real-time Sync APIs
// ----------------------------------------------------------------------

/**
 * Mark student absent or present
 */
export async function toggleAbsenteeAPI(payload) {
  const token = getAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/absentees/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Fetch live absentees map for the active session, date and shift
 */
export async function fetchLiveAbsenteesAPI(params = {}) {
  try {
    const searchParams = new URLSearchParams();
    if (params.sessionName) searchParams.append('sessionName', params.sessionName);
    if (params.date) searchParams.append('date', params.date);
    if (params.shift) searchParams.append('shift', params.shift);
    if (params.roomName) searchParams.append('roomName', params.roomName);

    const res = await fetch(`${API_BASE_URL}/absentees?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (error) {
    return { success: false, absenteeMap: {}, count: 0, totalAbsent: 0 };
  }
}

/**
 * Reset absentee records for a room or shift
 */
export async function resetAbsenteesAPI(params) {
  const token = getAuthToken();
  try {
    const res = await fetch(`${API_BASE_URL}/absentees/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// ----------------------------------------------------------------------
// Teacher Management APIs
// ----------------------------------------------------------------------

export async function fetchTeachersAPI() {
  try {
    const res = await fetch(`${API_BASE_URL}/teachers`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data;
  } catch (error) {
    return { success: false, data: [], message: error.message };
  }
}

export async function createTeacherAPI(teacherData) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/teachers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(teacherData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function updateTeacherAPI(id, teacherData) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/teachers/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(teacherData),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function deleteTeacherAPI(id) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/teachers/${id}`, {
      method: 'DELETE',
      headers,
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function bulkImportTeachersAPI(teachers, strategy = "merge") {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE_URL}/teachers/bulk-import`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ teachers, strategy }),
    });
    return await res.json();
  } catch (error) {
    return { success: false, message: error.message };
  }
}
