import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../ui/button';
import { User, CheckCircle2, Clock, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getHistoryByClasses, getStudentEngagementByClasses } from '../../services/firestoreService';
import { toast } from 'sonner';
import type { HistoryEntry, StudentEngagement } from '../../types/models';

export function TeacherDashboard() {
  const { user } = useAuth();
  const [engagement, setEngagement] = useState<StudentEngagement[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      if (!user?.assignedClasses?.length) return;

      try {
        const [engagementData, historyData] = await Promise.all([
          getStudentEngagementByClasses(user.assignedClasses),
          getHistoryByClasses(user.assignedClasses),
        ]);
        setEngagement(engagementData);
        setHistory(historyData.slice(0, 2));
      } catch {
        toast.error('Failed to load teacher dashboard data');
      }
    }

    loadDashboardData();
  }, [user?.assignedClasses]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const stats = useMemo(
    () => [
    {
      label: 'Completed',
      value: String(engagement.filter(item => item.status === 'completed').length),
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'In Progress',
      value: String(engagement.filter(item => item.status === 'in-progress').length),
      icon: Clock,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Not Seen',
      value: String(engagement.filter(item => item.status === 'not-seen').length),
      icon: Package,
      color: 'text-zinc-400',
      bg: 'bg-zinc-800',
    },
  ],
  [engagement],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-semibold">Dashboard</h1>
            <p className="text-sm text-zinc-400">{today}</p>
          </div>
          <Link to="/teacher/profile">
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <section>
          <h2 className="text-2xl font-semibold mb-1">Welcome back,</h2>
          <p className="text-lg text-indigo-400">{user?.name}</p>
        </section>

        {/* Today's Status */}
        <section>
          <h3 className="font-semibold mb-3">Today's Status</h3>
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Last updated</span>
              <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                Updated
              </span>
            </div>
            <p className="text-sm text-zinc-300 mb-4">
              You updated packing items for {user?.assignedClasses?.length || 0} classes today
            </p>
            <Link to="/teacher/update">
              <Button className="w-full bg-indigo-500 hover:bg-indigo-600">
                Update Today's Items
              </Button>
            </Link>
          </div>
        </section>

        {/* Assigned Classes */}
        <section>
          <h3 className="font-semibold mb-3">Your Classes</h3>
          <div className="grid grid-cols-3 gap-2">
            {user?.assignedClasses?.map(cls => (
              <div
                key={cls}
                className="bg-zinc-900 rounded-lg border border-zinc-800 p-3 text-center"
              >
                <p className="font-semibold">{cls}</p>
                {user.subject && (
                  <p className="text-xs text-zinc-500 mt-1">{user.subject}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Quick Stats */}
        <section>
          <h3 className="font-semibold mb-3">Student Engagement</h3>
          <div className="grid grid-cols-3 gap-3">
            {stats.map(stat => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-zinc-900 rounded-lg border border-zinc-800 p-4"
                >
                  <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-semibold mb-1">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                </div>
              );
            })}
          </div>
          <Link to="/teacher/engagement">
            <Button variant="outline" className="w-full mt-3 border-zinc-800">
              View Details
            </Button>
          </Link>
        </section>

        {/* Recent Activity */}
        <section>
          <h3 className="font-semibold mb-3">Recent Updates</h3>
          <div className="space-y-2">
            {history.length === 0 && <p className="text-sm text-zinc-500">No recent updates found.</p>}

            {history.map(entry => (
              <div key={entry.id} className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-medium">Class {entry.class}</p>
                  <p className="text-xs text-zinc-500">{entry.date}</p>
                </div>
                <p className="text-xs text-zinc-400">
                  Added {entry.itemsAdded.length} items • Removed {entry.itemsRemoved.length} items
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
