import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { getClasses, getQuickSuggestions, upsertTodayPackingItems } from '../../services/firestoreService';

interface Item {
  id: string;
  name: string;
  type: 'bring' | 'do-not-bring';
}

export function UpdateItems() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [action, setAction] = useState<'bring' | 'do-not-bring'>('bring');
  const [items, setItems] = useState<Item[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const availableClasses = useMemo(() => {
    const assigned = user?.assignedClasses ?? [];
    return assigned.length ? assigned : classes;
  }, [user?.assignedClasses, classes]);

  useEffect(() => {
    async function loadClasses() {
      try {
        const fromDb = await getClasses();
        setClasses(fromDb);

        const defaultClass = user?.assignedClasses?.[0] ?? fromDb[0] ?? '';
        setSelectedClass(defaultClass);
      } catch {
        toast.error('Unable to load classes from database');
      }
    }

    loadClasses();
  }, [user?.assignedClasses]);

  const addItem = (name: string) => {
    if (!name.trim()) return;
    
    const newItem: Item = {
      id: Date.now().toString(),
      name: name.trim(),
      type: action,
    };
    
    setItems(prev => [...prev, newItem]);
    setInputValue('');
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }
    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsSaving(true);

    try {
      await upsertTodayPackingItems({
        className: selectedClass,
        items,
        teacherId: user.id,
        teacherName: user.name,
      });

      const bringCount = items.filter(i => i.type === 'bring').length;
      const doNotBringCount = items.filter(i => i.type === 'do-not-bring').length;

      toast.success('Items updated successfully!', {
        description: `${bringCount} items to bring, ${doNotBringCount} items not to bring`,
      });

      setItems([]);
    } catch {
      toast.error('Failed to save items to database');
    } finally {
      setIsSaving(false);
    }
  };

  const bringItems = items.filter(i => i.type === 'bring');
  const doNotBringItems = items.filter(i => i.type === 'do-not-bring');

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link to="/teacher">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">Update Packing Items</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Class Selection */}
        <section>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Select Class</h3>
          <div className="flex flex-wrap gap-2">
            {availableClasses.map(cls => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedClass === cls
                    ? 'bg-indigo-500 text-white'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </section>

        {/* Action Toggle */}
        <section>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Action</h3>
          <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1 rounded-lg">
            <button
              onClick={() => setAction('bring')}
              className={`py-2.5 rounded-md text-sm font-medium transition-colors ${
                action === 'bring'
                  ? 'bg-green-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Bring
            </button>
            <button
              onClick={() => setAction('do-not-bring')}
              className={`py-2.5 rounded-md text-sm font-medium transition-colors ${
                action === 'do-not-bring'
                  ? 'bg-red-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Do NOT Bring
            </button>
          </div>
        </section>

        {/* Quick Suggestions */}
        <section>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Quick Add</h3>
          <div className="flex flex-wrap gap-2">
            {getQuickSuggestions().map(suggestion => (
              <button
                key={suggestion}
                onClick={() => addItem(suggestion)}
                className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-full text-sm text-zinc-300 hover:text-white transition-colors active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        {/* Custom Input */}
        <section>
          <h3 className="text-sm font-medium text-zinc-400 mb-2">Add Custom Item</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem(inputValue)}
              placeholder="Type item name..."
              className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg outline-none focus:border-indigo-500 transition-colors"
            />
            <Button
              onClick={() => addItem(inputValue)}
              size="icon"
              className="bg-indigo-500 hover:bg-indigo-600 h-auto aspect-square"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* Live Preview */}
        {items.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-zinc-400 mb-2">Preview</h3>
            <div className="space-y-4">
              {bringItems.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">TO BRING ({bringItems.length})</p>
                  <div className="space-y-2">
                    {bringItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20"
                      >
                        <span className="text-sm text-green-400">{item.name}</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-green-400/60 hover:text-green-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {doNotBringItems.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">DO NOT BRING ({doNotBringItems.length})</p>
                  <div className="space-y-2">
                    {doNotBringItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20"
                      >
                        <span className="text-sm text-red-400">{item.name}</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-400/60 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* Sticky Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={items.length === 0 || isSaving || !selectedClass}
            className="w-full bg-indigo-500 hover:bg-indigo-600 h-12 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : `Submit for ${selectedClass || 'Class'}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
