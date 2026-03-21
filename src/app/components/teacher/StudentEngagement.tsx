import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Eye, AlertCircle, Bell } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { getStudentEngagementByClass } from '../../services/firestoreService';
import type { StudentEngagement as StudentEngagementItem } from '../../types/models';

type StatusFilter = 'all' | 'completed' | 'in-progress' | 'not-seen' | 'inactive';

export function StudentEngagement() {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState(user?.assignedClasses?.[0] ?? '');
  const [students, setStudents] = useState<StudentEngagementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    async function loadEngagement() {
      setIsLoading(true);
      try {
        const data = await getStudentEngagementByClass(selectedClass);
        setStudents(data);
      } catch {
        toast.error('Failed to load student engagement');
      } finally {
        setIsLoading(false);
      }
    }

    loadEngagement();
  }, [selectedClass]);

  const statusConfig = {
    completed: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      label: 'Completed',
    },
    'in-progress': {
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      label: 'In Progress',
    },
    'not-seen': {
      icon: Eye,
      color: 'text-zinc-400',
      bg: 'bg-zinc-800',
      border: 'border-zinc-700',
      label: 'Not Seen',
    },
    inactive: {
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      label: 'Inactive',
    },
  };

  const filteredStudents = useMemo(
    () => (filter === 'all' ? students : students.filter(s => s.status === filter)),
    [filter, students],
  );

  const stats = useMemo(
    () => ({
      completed: students.filter(s => s.status === 'completed').length,
      'in-progress': students.filter(s => s.status === 'in-progress').length,
      'not-seen': students.filter(s => s.status === 'not-seen').length,
      inactive: students.filter(s => s.status === 'inactive').length,
    }),
    [students],
  );

  const handleRemindStudents = () => {
    const count = students.filter(s => s.status === 'not-seen' || s.status === 'inactive').length;
    toast.success(`Reminder sent to ${count} students`, {
      description: 'Students will be notified to check their packing list',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link to="/teacher">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold">Student Engagement</h1>
            <p className="text-xs text-zinc-400">Class {selectedClass || 'N/A'}</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <section>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(user?.assignedClasses ?? []).map(cls => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedClass === cls
                    ? 'bg-indigo-500 text-white'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-4 gap-2">
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            const count = stats[key as keyof typeof stats];
            const isActive = filter === key;

            return (
              <button
                key={key}
                onClick={() => setFilter(key as StatusFilter)}
                className={`p-3 rounded-lg border transition-colors ${
                  isActive
                    ? `${config.bg} ${config.border}`
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${config.color} mb-1`} />
                <p className="text-xl font-semibold">{count}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{config.label}</p>
              </button>
            );
          })}
        </section>

        {/* Filter Chips */}
        <section>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}
            >
              All ({students.length})
            </button>
            {Object.entries(statusConfig).map(([key, config]) => {
              const count = stats[key as keyof typeof stats];
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key as StatusFilter)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === key
                      ? 'bg-indigo-500 text-white'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>
        </section>

        {/* Student List */}
        <section className="space-y-2">
          {isLoading && <p className="text-sm text-zinc-400">Loading engagement...</p>}
          {!isLoading && filteredStudents.length === 0 && (
            <p className="text-sm text-zinc-400">No engagement records found for this class.</p>
          )}

          {filteredStudents.map(student => {
            const config = statusConfig[student.status];
            const Icon = config.icon;

            return (
              <div
                key={student.id}
                className={`p-4 rounded-lg border ${
                  student.status === 'inactive' ? 'bg-red-500/5 border-red-500/20' : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{student.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{student.class}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${config.bg} ${config.border} border`}>
                    <Icon className={`w-3 h-3 ${config.color}`} />
                    <span className={config.color}>{config.label}</span>
                  </div>
                </div>
                {student.lastSeen && (
                  <p className="text-xs text-zinc-500">Last seen: {student.lastSeen}</p>
                )}
              </div>
            );
          })}
        </section>

        {/* Remind Button */}
        <section>
          <Button
            onClick={handleRemindStudents}
            className="w-full bg-indigo-500 hover:bg-indigo-600 gap-2"
          >
            <Bell className="w-4 h-4" />
            Remind Students
          </Button>
        </section>
      </main>
    </div>
  );
}
