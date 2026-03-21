import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../ui/button';
import { getHistoryByClasses } from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
import type { HistoryEntry } from '../../types/models';
import { toast } from 'sonner';

export function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      if (!user?.assignedClasses?.length) {
        setHistory([]);
        setIsLoading(false);
        return;
      }

      try {
        const entries = await getHistoryByClasses(user.assignedClasses);
        setHistory(entries);
      } catch {
        toast.error('Failed to load history from database');
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [user?.assignedClasses]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link to="/teacher">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">History</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-4">
        {isLoading && <p className="text-sm text-zinc-400">Loading history...</p>}
        {!isLoading && history.length === 0 && <p className="text-sm text-zinc-400">No history found yet.</p>}

        {history.map(entry => {
          const date = new Date(entry.date);
          const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={entry.id}
              className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm font-medium">{formattedDate}</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                    {entry.class}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {entry.itemsAdded.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-green-500/10 rounded flex items-center justify-center">
                        <Plus className="w-3 h-3 text-green-500" />
                      </div>
                      <span className="text-xs font-medium text-green-400">
                        Added ({entry.itemsAdded.length})
                      </span>
                    </div>
                    <div className="pl-7 space-y-1">
                      {entry.itemsAdded.map((item, idx) => (
                        <p key={idx} className="text-sm text-zinc-400">
                          • {item}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {entry.itemsRemoved.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-red-500/10 rounded flex items-center justify-center">
                        <Minus className="w-3 h-3 text-red-400" />
                      </div>
                      <span className="text-xs font-medium text-red-400">
                        Removed ({entry.itemsRemoved.length})
                      </span>
                    </div>
                    <div className="pl-7 space-y-1">
                      {entry.itemsRemoved.map((item, idx) => (
                        <p key={idx} className="text-sm text-zinc-400">
                          • {item}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
