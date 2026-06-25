import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

// ── Auth Slice ─────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('sth_user') || 'null'),
    token: localStorage.getItem('sth_token') || null,
    loading: false,
    error: null,
  },

  reducers: {
    setCredentials(state, { payload }) {
      state.user = payload.user;
      state.token = payload.accessToken;

      localStorage.setItem(
        'sth_token',
        payload.accessToken
      );

      if (payload.refreshToken) {
        localStorage.setItem(
          'sth_refresh',
          payload.refreshToken
        );
      }

      localStorage.setItem(
        'sth_user',
        JSON.stringify(payload.user)
      );
    },

    updateUser(state, { payload }) {
      state.user = {
        ...state.user,
        ...payload,
      };

      localStorage.setItem(
        'sth_user',
        JSON.stringify(state.user)
      );
    },

    logout(state) {
      state.user = null;
      state.token = null;

      localStorage.removeItem('sth_token');
      localStorage.removeItem('sth_refresh');
      localStorage.removeItem('sth_user');
    },

    setLoading(state, { payload }) {
      state.loading = payload;
    },

    setError(state, { payload }) {
      state.error = payload;
    },
  },
});
// ── Courses Slice ──────────────────────────────────────────
const coursesSlice = createSlice({
  name: 'courses',
  initialState: { list: [], current: null, myCourses: [], loading: false, pagination: null },
  reducers: {
    setCourses(state, { payload })    { state.list = payload.data || payload || []; state.pagination = payload.pagination || null; },
    setCurrentCourse(state, { payload }) { state.current = payload; },
    setMyCourses(state, { payload })  { state.myCourses = payload || []; },
    setLoading(state, { payload })    { state.loading = payload; },
    updateProgress(state, { payload }) {
      const c = state.myCourses.find(x => x.id === payload.courseId);
      if (c) c.progress_pct = payload.progressPct;
    },
  },
});

// ── Live Slice ─────────────────────────────────────────────
const liveSlice = createSlice({
  name: 'live',
  initialState: { sessions: [], current: null, token: null, loading: false },
  reducers: {
    setSessions(state, { payload }) { state.sessions = payload; },
    setCurrentSession(state, { payload }) { state.current = payload; },
    setToken(state, { payload })    { state.token = payload; },
    setLoading(state, { payload })  { state.loading = payload; },
  },
});

// ── Notifications Slice ────────────────────────────────────
const notifSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unread: 0 },
  reducers: {
    setNotifications(state, { payload }) { state.items = payload.notifications; state.unread = payload.unread; },
    addNotification(state, { payload })  { state.items.unshift(payload); state.unread++; },
    markRead(state, { payload })         { const n = state.items.find(x => x.id === payload); if (n) { n.is_read = true; state.unread = Math.max(0, state.unread - 1); } },
    markAllRead(state)                   { state.items.forEach(n => n.is_read = true); state.unread = 0; },
  },
});

// ── UI Slice ───────────────────────────────────────────────
const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: false, theme: 'dark' },
  reducers: {
    toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen(state, { payload }) { state.sidebarOpen = payload; },
  },
});

export const store = configureStore({
  reducer: {
    auth:          authSlice.reducer,
    courses:       coursesSlice.reducer,
    live:          liveSlice.reducer,
    notifications: notifSlice.reducer,
    ui:            uiSlice.reducer,
  },
});

export const authActions  = authSlice.actions;
export const courseActions = coursesSlice.actions;
export const liveActions   = liveSlice.actions;
export const notifActions  = notifSlice.actions;
export const uiActions     = uiSlice.actions;

// Selectors
export const selectUser          = s => s.auth.user;
export const selectToken         = s => s.auth.token;
export const selectIsAuth        = s => !!s.auth.token;
export const selectCourses       = s => s.courses.list;
export const selectCurrentCourse = s => s.courses.current;
export const selectMyCourses     = s => s.courses.myCourses;
export const selectSessions      = s => s.live.sessions;
export const selectNotifications = s => s.notifications.items;
export const selectUnreadCount   = s => s.notifications.unread;
