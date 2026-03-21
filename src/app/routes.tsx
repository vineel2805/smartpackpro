import { createBrowserRouter, Navigate } from 'react-router';
import { useAuth } from './context/AuthContext';
import type { UserRole } from './context/AuthContext';
import { Login } from './components/shared/Login';
import { SchoolSelector } from './components/shared/SchoolSelector';
import { HelpSupport } from './components/shared/HelpSupport';
import { TodaysBag } from './components/student/TodaysBag';
import { StudentProfile } from './components/student/StudentProfile';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { UpdateItems } from './components/teacher/UpdateItems';
import { History } from './components/teacher/History';
import { StudentEngagement } from './components/teacher/StudentEngagement';
import { TeacherProfile } from './components/teacher/TeacherProfile';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TeachersManagement } from './components/admin/TeachersManagement';
import { BottomNav } from './components/teacher/BottomNav';

function getHomeRouteByRole(role: UserRole) {
  switch (role) {
    case 'student':
      return '/student';
    case 'teacher':
      return '/teacher';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}

function ProtectedRoute({
  allowedRole,
  children,
}: {
  allowedRole: UserRole;
  children: React.ReactNode;
}) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== allowedRole) {
    return <Navigate to={getHomeRouteByRole(user.role)} replace />;
  }

  return <>{children}</>;
}

// Layout wrapper for teacher routes
function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SchoolSelector />,
  },
  {
    path: '/login/:schoolName',
    element: <Login />,
  },
  {
    path: '/student',
    element: (
      <ProtectedRoute allowedRole="student">
        <TodaysBag />
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/profile',
    element: (
      <ProtectedRoute allowedRole="student">
        <StudentProfile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/teacher',
    element: (
      <ProtectedRoute allowedRole="teacher">
        <TeacherLayout>
          <TeacherDashboard />
        </TeacherLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/teacher/update',
    element: (
      <ProtectedRoute allowedRole="teacher">
        <TeacherLayout>
          <UpdateItems />
        </TeacherLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/teacher/history',
    element: (
      <ProtectedRoute allowedRole="teacher">
        <TeacherLayout>
          <History />
        </TeacherLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/teacher/engagement',
    element: (
      <ProtectedRoute allowedRole="teacher">
        <StudentEngagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/teacher/profile',
    element: (
      <ProtectedRoute allowedRole="teacher">
        <TeacherProfile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRole="admin">
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/teachers',
    element: (
      <ProtectedRoute allowedRole="admin">
        <TeachersManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/help',
    element: <HelpSupport />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
