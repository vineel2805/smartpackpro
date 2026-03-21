import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { getClasses, getChecklistAuditData } from '../../services/firestoreService';
import { toast } from 'sonner';

interface AuditItem {
  name: string;
  type: 'bring' | 'do-not-bring';
  sources: Array<{
    teacherName: string;
    teacherRoleType: 'class-teacher' | 'subject-teacher';
    teacherSubject?: string;
    priority: number;
    won: boolean;
  }>;
}

export function ChecklistAudit() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [auditData, setAuditData] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function loadClasses() {
      try {
        const classData = await getClasses();
        setClasses(classData);
        if (classData.length > 0) {
          setSelectedClass(classData[0]);
        }
      } catch {
        toast.error('Failed to load classes');
      }
    }

    loadClasses();
  }, []);

  useEffect(() => {
    async function loadAuditData() {
      if (!selectedClass) return;

      setLoading(true);
      try {
        const data = await getChecklistAuditData(selectedClass, today);
        setAuditData(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load audit data');
        setAuditData([]);
      } finally {
        setLoading(false);
      }
    }

    loadAuditData();
  }, [selectedClass]);

  if (!selectedClass && classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950">
        <p className="text-zinc-400">No classes found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 border-r border-zinc-800 min-h-screen">
          <div className="p-6">
            <h1 className="text-xl font-semibold">Smart Pack App</h1>
            <p className="text-sm text-zinc-500 mt-1">Admin Panel</p>
          </div>
          <nav className="px-3 space-y-1">
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
            >
              Dashboard
            </Link>
            <Link
              to="/admin/teachers"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
            >
              Teachers
            </Link>
            <Link
              to="/admin/checklist-audit"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400"
            >
              Checklist Audit
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold">Checklist Audit</h2>
              <p className="text-zinc-400 mt-2">View which teacher updates won for today's checklist</p>
            </div>

            {/* Class Selector */}
            <Card className="mb-6 border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white">Select Class</CardTitle>
                <CardDescription>Choose a class to view checklist resolution details</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-full bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {classes.map(className => (
                      <SelectItem key={className} value={className} className="text-white">
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Audit Results */}
            <Card className="border-zinc-800 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white">
                  {selectedClass} - {today}
                </CardTitle>
                <CardDescription>
                  {auditData.length === 0 && !loading
                    ? 'No updates for this class today'
                    : `${auditData.length} items in final checklist`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-zinc-400">Loading...</p>
                  </div>
                ) : auditData.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-zinc-400">No updates found for this class today</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditData.map((item, idx) => (
                      <div
                        key={`${item.name}-${idx}`}
                        className="border border-zinc-800 rounded-lg p-4 bg-zinc-800/30"
                      >
                        {/* Item Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-white">{item.name}</p>
                            <p className="text-sm text-zinc-400">
                              Type:{' '}
                              <span
                                className={
                                  item.type === 'bring'
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }
                              >
                                {item.type === 'bring' ? 'Bring' : 'Do Not Bring'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Sources/Conflicts */}
                        {item.sources.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-zinc-700">
                            <p className="text-xs text-zinc-500 uppercase tracking-wider">
                              Update Sources ({item.sources.length})
                            </p>
                            {item.sources.map((source, sourceIdx) => (
                              <div
                                key={sourceIdx}
                                className={`flex items-center justify-between p-2 rounded text-sm ${
                                  source.won
                                    ? 'bg-green-500/15 border border-green-500/30'
                                    : 'bg-zinc-700/20 border border-zinc-700/30'
                                }`}
                              >
                                <div className="flex-1">
                                  <p className="text-white">
                                    {source.teacherName}
                                    <span
                                      className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                        source.teacherRoleType === 'class-teacher'
                                          ? 'bg-indigo-500/30 text-indigo-300'
                                          : 'bg-amber-500/30 text-amber-300'
                                      }`}
                                    >
                                      {source.teacherRoleType === 'class-teacher'
                                        ? 'Class Teacher'
                                        : `Subject Teacher (${source.teacherSubject})`}
                                    </span>
                                  </p>
                                  <p className="text-xs text-zinc-400 mt-1">
                                    Priority: {source.priority}
                                  </p>
                                </div>
                                {source.won && (
                                  <div className="flex items-center gap-1 text-green-400 font-semibold text-xs">
                                    <ChevronRight className="w-4 h-4" />
                                    WINNER
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="mt-6 border-zinc-800 bg-zinc-900/50">
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm text-zinc-400">
                  <p>
                    <span className="text-indigo-400 font-semibold">Class Teachers</span> have{' '}
                    <span className="font-semibold">priority 2</span> and override subject teachers.
                  </p>
                  <p>
                    <span className="text-amber-400 font-semibold">Subject Teachers</span> have{' '}
                    <span className="font-semibold">priority 1</span> and are shown for reference.
                  </p>
                  <p className="mt-3">
                    When multiple teachers update the same item for the same class on the same day, the
                    higher priority update wins and appears in the final checklist.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
