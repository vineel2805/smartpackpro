import { useState, useEffect } from 'react';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertCircle, Plus, User } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { getTodayPackingItems } from '../../services/firestoreService';
import type { StudentChecklistItem } from '../../types/models';

export function TodaysBag() {
  const { user } = useAuth();
  const [items, setItems] = useState<StudentChecklistItem[]>([]);
  const [customItems, setCustomItems] = useState<StudentChecklistItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTodayItems() {
      if (!user?.class) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      try {
        const dailyItems = await getTodayPackingItems(user.class);
        setItems(
          dailyItems.map(item => ({
            ...item,
            checked: false,
          })),
        );
      } catch {
        toast.error('Unable to load today\'s bag from database');
      } finally {
        setIsLoading(false);
      }
    }

    const stored = localStorage.getItem('customItems');
    if (stored) {
      setCustomItems(JSON.parse(stored));
    }

    loadTodayItems();
  }, [user?.class]);

  const bringItems = items.filter(item => item.type === 'bring');
  const doNotBringItems = items.filter(item => item.type === 'do-not-bring');
  const checkedCount = bringItems.filter(item => item.checked).length + customItems.filter(item => item.checked).length;
  const totalCount = bringItems.length + customItems.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  const handleCheck = (id: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleCustomCheck = (id: string) => {
    const updated = customItems.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    setCustomItems(updated);
    localStorage.setItem('customItems', JSON.stringify(updated));
  };

  const handleAddCustomItem = () => {
    if (!newItemName.trim()) return;

    const newItem: StudentChecklistItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      type: 'bring',
      addedBy: 'student',
      checked: false,
    };

    const updated = [...customItems, newItem];
    setCustomItems(updated);
    localStorage.setItem('customItems', JSON.stringify(updated));
    setNewItemName('');
    setIsAddingItem(false);
    toast.success('Item added to your list');
  };

  const handleDonePacking = () => {
    if (progress === 100) {
      toast.success('Great job! Your bag is ready! 🎒', {
        description: 'Have a wonderful day at school!',
      });
    } else {
      toast.warning('Almost there!', {
        description: `You have ${totalCount - checkedCount} items left to pack.`,
      });
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border px-4 py-4">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div>
              <h1 className="font-semibold">Today's Bag</h1>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
            <Link to="/student/profile">
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </header>
        <main className="max-w-md mx-auto px-4 py-12 text-center text-muted-foreground">Loading bag items...</main>
      </div>
    );
  }

  if (totalCount === 0 && doNotBringItems.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border px-4 py-4">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div>
              <h1 className="font-semibold">Today's Bag</h1>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
            <Link to="/student/profile">
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-secondary rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">No items assigned today</h2>
              <p className="text-muted-foreground text-sm">
                Your teacher hasn't added any items yet. Check back later!
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-sm border-b border-border px-4 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="font-semibold">Today's Bag</h1>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
            <Link to="/student/profile">
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="w-5 h-5" />
              </Button>
            </Link>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {checkedCount}/{totalCount} packed
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {user?.class && (
            <div className="mt-2">
              <span className="text-xs px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">
                Class {user.class}
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-6">
        {/* Bring These Section */}
        {bringItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h2 className="font-semibold">Bring These</h2>
            </div>
            <div className="space-y-2">
              {bringItems.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-muted-foreground/30 transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => handleCheck(item.id)}
                    className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                      {item.name}
                    </p>
                    {item.subject && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.subject}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* My Items Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-indigo-500" />
            <h2 className="font-semibold">My Items</h2>
          </div>
          <div className="space-y-2">
            {customItems.map(item => (
              <label
                key={item.id}
                className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-muted-foreground/30 transition-colors cursor-pointer active:scale-[0.98]"
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => handleCustomCheck(item.id)}
                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                />
                <div className="flex-1 min-w-0">
                  <p className={`${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                    {item.name}
                  </p>
                </div>
              </label>
            ))}

            {isAddingItem ? (
              <div className="p-3 bg-card rounded-lg border border-indigo-500/50">
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomItem()}
                  placeholder="Item name..."
                  className="w-full bg-transparent outline-none text-sm"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleAddCustomItem}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600"
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingItem(false);
                      setNewItemName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingItem(true)}
                className="w-full p-3 bg-card rounded-lg border border-dashed border-border hover:border-indigo-500/50 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-indigo-400 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Add your own item
              </button>
            )}
          </div>
        </section>

        {/* Do NOT Bring Section */}
        {doNotBringItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h2 className="font-semibold">Do NOT Bring</h2>
            </div>
            <div className="space-y-2">
              {doNotBringItems.map(item => (
                <div
                  key={item.id}
                  className="p-3 bg-red-500/5 rounded-lg border border-red-500/20"
                >
                  <p className="text-red-400">{item.name}</p>
                  {item.subject && (
                    <p className="text-xs text-red-400/60 mt-0.5">{item.subject}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky Done Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="max-w-md mx-auto">
          <Button
            onClick={handleDonePacking}
            className="w-full bg-indigo-500 hover:bg-indigo-600 h-12 text-base font-medium"
          >
            {progress === 100 ? 'All Done! 🎒' : 'Done Packing'}
          </Button>
        </div>
      </div>
    </div>
  );
}