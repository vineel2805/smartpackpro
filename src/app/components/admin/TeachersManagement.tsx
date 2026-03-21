import { useEffect, useState } from 'react';
import { Users, School, Plus, Award } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getClasses, getTeachers, updateTeacherAssignments } from '../../services/firestoreService';
import type { AppUser } from '../../types/models';

export function TeachersManagement() {
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [savingTeacherId, setSavingTeacherId] = useState<string | null>(null);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editAssignedClasses, setEditAssignedClasses] = useState<string[]>([]);
  const [editClassTeacherOf, setEditClassTeacherOf] = useState('');

  async function loadTeachers() {
    try {
      const [teacherData, classData] = await Promise.all([getTeachers(), getClasses()]);
      setTeachers(teacherData);
      setAllClasses(classData);
    } catch {
      toast.error('Failed to load teachers from database');
    }
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleAddTeacher = () => {
    toast.info('Add teacher functionality would open a form here');
  };

  const startEditingTeacher = (teacher: AppUser) => {
    setEditingTeacherId(teacher.id);
    setEditAssignedClasses(teacher.assignedClasses ?? []);
    setEditClassTeacherOf(teacher.classTeacherOf ?? '');
  };

  const cancelEditingTeacher = () => {
    setEditingTeacherId(null);
    setEditAssignedClasses([]);
    setEditClassTeacherOf('');
  };

  const toggleClassSelection = (className: string) => {
    setEditAssignedClasses(prev =>
      prev.includes(className)
        ? prev.filter(item => item !== className)
        : [...prev, className],
    );
  };

  const handleSaveAssignments = async (teacher: AppUser) => {
    const normalizedClassTeacherOf = editClassTeacherOf.trim();
    const assignedClasses = Array.from(new Set(editAssignedClasses));

    if (normalizedClassTeacherOf && !assignedClasses.includes(normalizedClassTeacherOf)) {
      toast.error('Class teacher class must be in assigned classes');
      return;
    }

    setSavingTeacherId(teacher.id);
    try {
      await updateTeacherAssignments({
        teacherId: teacher.id,
        assignedClasses,
        isClassTeacher: Boolean(normalizedClassTeacherOf),
        classTeacherOf: normalizedClassTeacherOf || undefined,
      });

      toast.success('Teacher assignments updated');
      cancelEditingTeacher();
      await loadTeachers();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update teacher assignments';
      toast.error(message);
    } finally {
      setSavingTeacherId(null);
    }
  };

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
              <School className="w-5 h-5" />
              Dashboard
            </Link>
            <Link
              to="/admin/teachers"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-400"
            >
              <Users className="w-5 h-5" />
              Teachers
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <header className="border-b border-zinc-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Teachers Management</h2>
                <p className="text-sm text-zinc-400 mt-0.5">Manage teachers and class assignments</p>
              </div>
              <Button onClick={handleAddTeacher} className="bg-indigo-500 hover:bg-indigo-600 gap-2">
                <Plus className="w-4 h-4" />
                Add Teacher
              </Button>
            </div>
          </header>

          <div className="p-6">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-zinc-800">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Name</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Subject</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Assigned Classes</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Role</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {teachers.map(teacher => (
                    <>
                      <tr key={teacher.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium">{teacher.name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-zinc-400">{teacher.subject}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {(teacher.assignedClasses ?? []).map(cls => (
                              <span
                                key={cls}
                                className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-xs border border-indigo-500/20"
                              >
                                {cls}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {teacher.isClassTeacher ? (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Award className="w-3 h-3 text-green-500" />
                              <span className="text-green-400">Class Teacher</span>
                              <span className="text-zinc-500">({teacher.classTeacherOf})</span>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-500">Subject Teacher</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingTeacherId === teacher.id ? (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-zinc-700"
                                onClick={() => handleSaveAssignments(teacher)}
                                disabled={savingTeacherId === teacher.id}
                              >
                                {savingTeacherId === teacher.id ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditingTeacher}
                                disabled={savingTeacherId === teacher.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-zinc-700"
                              onClick={() => startEditingTeacher(teacher)}
                            >
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>

                      {editingTeacherId === teacher.id && (
                        <tr className="bg-zinc-950/70">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs text-zinc-400 mb-2">Assign Classes</p>
                                <div className="flex flex-wrap gap-2">
                                  {allClasses.map(className => (
                                    <button
                                      key={className}
                                      onClick={() => toggleClassSelection(className)}
                                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                                        editAssignedClasses.includes(className)
                                          ? 'bg-indigo-500 text-white border-indigo-500'
                                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                                      }`}
                                    >
                                      {className}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs text-zinc-400 mb-2">Class Teacher Of (optional)</p>
                                <select
                                  value={editClassTeacherOf}
                                  onChange={event => setEditClassTeacherOf(event.target.value)}
                                  className="w-full md:w-80 h-10 px-3 bg-zinc-900 border border-zinc-800 rounded-lg outline-none focus:border-indigo-500"
                                >
                                  <option value="">Not a class teacher</option>
                                  {editAssignedClasses.map(className => (
                                    <option key={className} value={className}>
                                      {className}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
