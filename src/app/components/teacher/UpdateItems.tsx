import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { getClasses, getQuickSuggestions, submitTeacherUpdates } from '../../services/firestoreService';

interface Item {
  id: string;
  name: string;
  type: 'bring' | 'do-not-bring';
  subject?: string;
}

export function UpdateItems() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [action, setAction] = useState<'bring' | 'do-not-bring'>('bring');
  const [scope, setScope] = useState<'subject' | 'general'>('subject');
  const [items, setItems] = useState<Item[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const teacherSubject = (user?.subject ?? '').trim();
  const isClassTeacher = Boolean(user?.isClassTeacher);

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
        setSelectedClasses(defaultClass ? [defaultClass] : []);
      } catch {
        toast.error('Unable to load classes from database');
      }
    }

    loadClasses();
  }, [user?.assignedClasses]);

  const toggleClassSelection = (className: string) => {
    setSelectedClasses(prev =>
      prev.includes(className)
        ? prev.filter(item => item !== className)
        : [...prev, className],
    );
  };

  const addItem = (name: string) => {
    if (!name.trim()) return;

    const itemSubject = scope === 'subject' ? teacherSubject || undefined : undefined;
    
    const newItem: Item = {
      id: Date.now().toString(),
      name: name.trim(),
      type: action,
      subject: itemSubject,
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
    if (selectedClasses.length === 0) {
      toast.error('Please select at least one class');
      return;
    }
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setIsSaving(true);

    try {
      await submitTeacherUpdates({
        classNames: selectedClasses,
        items,
        teacherId: user.id,
        teacherName: user.name,
        teacherRoleType: scope === 'general' ? 'class-teacher' : 'subject-teacher',
        teacherSubject: teacherSubject || undefined,
      });

      const bringCount = items.filter(i => i.type === 'bring').length;
      const doNotBringCount = items.filter(i => i.type === 'do-not-bring').length;

      toast.success('Update sent successfully!', {
        description: `${selectedClasses.length} class(es) updated • ${bringCount} bring • ${doNotBringCount} do not bring`,
      });

      setItems([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save items to database';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const bringItems = items.filter(i => i.type === 'bring');
  const doNotBringItems = items.filter(i => i.type === 'do-not-bring');
  const quickSuggestions = useMemo(
    () => getQuickSuggestions({ subject: teacherSubject, scope }),
    [teacherSubject, scope],
  );

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link to="/teacher">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">Update Packing Items</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6 pb-40">
        {/* Class Selection */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Select Class(es)</h3>
          <div className="flex flex-wrap gap-2">
            {availableClasses.map(cls => (
              <button
                key={cls}
                onClick={() => toggleClassSelection(cls)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedClasses.includes(cls)
                    ? 'bg-indigo-500 text-foreground'
                    : 'bg-muted text-muted-foreground border border-border hover:border-border/80'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        </section>

        {teacherSubject && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Instruction Type</h3>
            <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setScope('subject')}
                className={`py-2.5 rounded-md text-sm font-medium transition-colors ${
                  scope === 'subject'
                    ? 'bg-indigo-500 text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                Subject ({teacherSubject})
              </button>
              <button
                onClick={() => setScope('general')}
                disabled={!isClassTeacher}
                className={`py-2.5 rounded-md text-sm font-medium transition-colors ${
                  scope === 'general'
                    ? 'bg-indigo-500 text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                General
              </button>
            </div>
            {!isClassTeacher && (
              <p className="text-xs text-muted-foreground/70 mt-2">Only class teachers can send general instructions.</p>
            )}
          </section>
        )}

        {/* Action Toggle */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Action</h3>
          <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setAction('bring')}
              className={`py-2.5 rounded-md text-sm font-medium transition-colors ${
                action === 'bring'
                  ? 'bg-green-500 text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80'
              }`}
            >
              Bring
            </button>
            <button
              onClick={() => setAction('do-not-bring')}
              className={`py-2.5 rounded-md text-sm font-medium transition-colors ${
                action === 'do-not-bring'
                  ? 'bg-red-500 text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80'
              }`}
            >
              Do NOT Bring
            </button>
          </div>
        </section>

        {/* Quick Suggestions */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Quick Add</h3>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => addItem(suggestion)}
                className="px-3 py-1.5 bg-muted border border-border hover:border-indigo-500/50 rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-95"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        {/* Custom Input */}
        <section>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Add Custom Item</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem(inputValue)}
              placeholder="Type item name..."
              className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg outline-none focus:border-indigo-500 transition-colors text-foreground"
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
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Preview</h3>
            <div className="space-y-4">
              {bringItems.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground/70 mb-2">TO BRING ({bringItems.length})</p>
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
                  <p className="text-xs text-muted-foreground/70 mb-2">DO NOT BRING ({doNotBringItems.length})</p>
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
      <div className="fixed bottom-16 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleSubmit}
            disabled={items.length === 0 || isSaving || selectedClasses.length === 0}
            className="w-full bg-indigo-500 hover:bg-indigo-600 h-12 text-base font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
              ? 'Sending Update...'
              : `Send Update (${selectedClasses.length} class${selectedClasses.length === 1 ? '' : 'es'})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
