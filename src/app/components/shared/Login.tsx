import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { GraduationCap, Users, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { getFirstUserByRole } from '../../services/firestoreService';

export function Login() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (role: UserRole) => {
    if (isLoggingIn) return;

    setSelectedRole(role);
    setIsLoggingIn(true);

    try {
      const user = await getFirstUserByRole(role);

      if (!user) {
        toast.error(`No ${role} user found in Firestore`);
        return;
      }

      login(user);
      navigate(`/${role}`);
    } catch {
      toast.error('Login failed. Please check Firebase configuration and data.');
    } finally {
      setIsLoggingIn(false);
      setSelectedRole(null);
    }
  };

  const roles = [
    {
      role: 'student' as UserRole,
      title: 'Student',
      description: 'Check your daily packing list',
      icon: GraduationCap,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      role: 'teacher' as UserRole,
      title: 'Teacher',
      description: 'Manage student packing items',
      icon: Users,
      color: 'from-purple-500 to-pink-500',
    },
    {
      role: 'admin' as UserRole,
      title: 'Admin',
      description: 'Manage teachers and classes',
      icon: Shield,
      color: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-semibold">Smart Pack App</h1>
          <p className="text-muted-foreground">Pack smarter, learn better</p>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground text-center">Select your role to continue</p>
          {roles.map(({ role, title, description, icon: Icon, color }) => (
            <button
              key={role}
              onClick={() => handleLogin(role)}
              disabled={isLoggingIn}
              className="w-full p-4 bg-card rounded-xl border border-border hover:border-muted-foreground/30 transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <svg
                  className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground/60">
          <p>{isLoggingIn && selectedRole ? `Signing in as ${selectedRole}...` : 'Connected to Firebase backend'}</p>
          <p className="mt-1">© 2026 Smart Pack App</p>
        </div>
      </div>
    </div>
  );
}