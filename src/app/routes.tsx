import { createBrowserRouter, Navigate } from 'react-router';
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
    element: <TodaysBag />,
  },
  {
    path: '/student/profile',
    element: <StudentProfile />,
  },
  {
    path: '/teacher',
    element: (
      <TeacherLayout>
        <TeacherDashboard />
      </TeacherLayout>
    ),
  },
  {
    path: '/teacher/update',
    element: (
      <TeacherLayout>
        <UpdateItems />
      </TeacherLayout>
    ),
  },
  {
    path: '/teacher/history',
    element: (
      <TeacherLayout>
        <History />
      </TeacherLayout>
    ),
  },
  {
    path: '/teacher/engagement',
    element: <StudentEngagement />,
  },
  {
    path: '/teacher/profile',
    element: <TeacherProfile />,
  },
  {
    path: '/admin',
    element: <AdminDashboard />,
  },
  {
    path: '/admin/teachers',
    element: <TeachersManagement />,
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
