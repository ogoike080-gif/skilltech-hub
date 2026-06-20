import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { selectIsAuth, selectUser } from './store';
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import LoadingScreen from './components/ui/LoadingScreen';
console.log('App.jsx .Env', import.meta.env);

const DiagnosticsPage = lazy(() => import('./pages/DiagnosticsPage'));


// Lazy-loaded pages
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const JoinClassPage = lazy(() => import('./pages/live/JoinClassPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const OAuthCallbackPage = lazy(() => import('./pages/auth/OAuthCallbackPage'));
const AuthErrorPage = lazy(() => import('./pages/auth/AuthErrorPage'));
const CoursesPage = lazy(() => import('./pages/courses/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/courses/CourseDetailPage'));
const LearnPage = lazy(() => import('./pages/courses/LearnPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const LivePage = lazy(() => import('./pages/live/LivePage'));
const ClassroomPage = lazy(() => import('./pages/live/ClassroomPage'));
const AiTutorPage = lazy(() => import('./pages/ai/AiTutorPage'));
const CommunityPage = lazy(() => import('./pages/community/CommunityPage'));
const PostPage = lazy(() => import('./pages/community/PostPage'));
const MentorsPage = lazy(() => import('./pages/mentors/MentorsPage'));
const MentorDetailPage = lazy(() => import('./pages/mentors/MentorDetailPage'));
const JobsPage = lazy(() => import('./pages/jobs/JobsPage'));
const CertificatesPage = lazy(() => import('./pages/certificates/CertificatesPage'));
const VerifyPage = lazy(() => import('./pages/certificates/VerifyPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const SchoolsPage = lazy(() => import('./pages/schools/SchoolsPage'));
const SchoolPage = lazy(() => import('./pages/schools/SchoolPage'));
const StreamStudioPage = lazy(() => import('./pages/streaming/StreamStudioPage'));
const InstructorPage = lazy(() => import('./pages/instructor/InstructorPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function PrivateRoute({ children, roles }) {
  const isAuth = useSelector(selectIsAuth);
  const user = useSelector(selectUser);

  if (!isAuth) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
         <Route path="/join" element={<JoinClassPage />} />
          <Route path="/diagnostics" element={<DiagnosticsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/auth/error" element={<AuthErrorPage />} />

          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:slug" element={<CourseDetailPage />} />
            <Route path="schools" element={<SchoolsPage />} />
            <Route path="schools/:slug" element={<SchoolPage />} />
            <Route path="mentors" element={<MentorsPage />} />
            <Route path="mentors/:id" element={<MentorDetailPage />} />
            <Route path="jobs" element={<JobsPage />} />
            <Route path="community" element={<CommunityPage />} />
            <Route path="community/:id" element={<PostPage />} />
            <Route path="live" element={<LivePage />} />
            <Route path="verify/:token" element={<VerifyPage />} />
          </Route>

          <Route
            element={
              <PrivateRoute>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/learn/:courseId/:lessonId?" element={<LearnPage />} />
            <Route path="/ai-tutor" element={<AiTutorPage />} />
            <Route path="/classroom/:sessionId" element={<ClassroomPage />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route
            element={
              <PrivateRoute roles={['instructor', 'admin']}>
                <DashboardLayout />
              </PrivateRoute>
            }
          >
            <Route path="/instructor" element={<InstructorPage />} />
            <Route path="/stream/:sessionId" element={<StreamStudioPage />} />
          </Route>

          <Route
            path="/admin/*"
            element={
              <PrivateRoute roles={['admin']}>
                <AdminPage />
              </PrivateRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
