import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, School, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { getSchools, type SchoolOption } from '../../services/firestoreService';

export function SchoolSelector() {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadSchools() {
      try {
        const data = await getSchools();
        setSchools(data);
      } catch {
        toast.error('Unable to load schools');
      } finally {
        setIsLoading(false);
      }
    }

    loadSchools();
  }, []);

  const filteredSchools = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return schools;

    return schools.filter(school => school.name.toLowerCase().includes(query));
  }, [schools, searchTerm]);

  const handleSchoolSelect = (school: SchoolOption) => {
    navigate(`/login/${encodeURIComponent(school.name)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <School className="w-8 h-8 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-semibold">Find Your School</h1>
          <p className="text-muted-foreground">Search your school and continue to login</p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search school name"
            className="w-full h-11 pl-10 pr-3 bg-card border border-border rounded-lg outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
          {isLoading && (
            <div className="text-sm text-muted-foreground p-3">Loading schools...</div>
          )}

          {!isLoading && filteredSchools.length === 0 && (
            <div className="text-sm text-muted-foreground p-3 border border-dashed border-border rounded-lg">
              No schools found.
            </div>
          )}

          {!isLoading && filteredSchools.map(school => (
            <Button
              key={school.id}
              variant="outline"
              className="w-full h-12 justify-between"
              onClick={() => handleSchoolSelect(school)}
            >
              <span>{school.name}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}