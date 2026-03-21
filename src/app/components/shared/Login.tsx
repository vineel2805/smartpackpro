import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth, UserRole } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { loginWithSchoolCredentials } from '../../services/firestoreService';

export function Login() {
  const { schoolName: encodedSchoolName } = useParams();
  const schoolName = encodedSchoolName ? decodeURIComponent(encodedSchoolName) : '';
  const [role, setRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (isLoggingIn) return;

    if (!schoolName) {
      toast.error('Please select a school first');
      navigate('/');
      return;
    }

    if (!email.trim() || !password.trim()) {
      toast.error('Enter your email and password');
      return;
    }

    setIsLoggingIn(true);

    try {
      const user = await loginWithSchoolCredentials({
        schoolName,
        role,
        email,
        password,
      });

      if (!user) {
        toast.error('Invalid school, role, or credentials');
        return;
      }

      login(user);
      navigate(`/${role}`);
    } catch {
      toast.error('Login failed. Please check your internet and data setup.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to schools
        </button>

        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-semibold">Smart Pack App</h1>
          <p className="text-muted-foreground">{schoolName || 'Select school to continue'}</p>
        </div>

        <div className="space-y-3 bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Login with your school credentials</p>

          <div className="space-y-2">
            <label className="text-sm">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 bg-background border border-border rounded-lg outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full h-10 px-3 bg-background border border-border rounded-lg outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-10 px-3 bg-background border border-border rounded-lg outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <Button onClick={handleLogin} disabled={isLoggingIn} className="w-full">
            {isLoggingIn ? 'Signing in...' : 'Login'}
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground/60">
          <p>{isLoggingIn ? `Signing in as ${role}...` : 'Connected to Firebase backend'}</p>
          <p className="mt-1">© 2026 Smart Pack App</p>
        </div>
      </div>
    </div>
  );
}