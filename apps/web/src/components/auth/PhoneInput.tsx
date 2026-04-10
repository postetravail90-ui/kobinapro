import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ChevronDown } from 'lucide-react';

const COUNTRIES = [
  { code: '+225', flag: '🇨🇮', name: 'Côte d\'Ivoire', default: true },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+1', flag: '🇺🇸', name: 'États-Unis' },
  { code: '+237', flag: '🇨🇲', name: 'Cameroun' },
  { code: '+221', flag: '🇸🇳', name: 'Sénégal' },
  { code: '+223', flag: '🇲🇱', name: 'Mali' },
  { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
  { code: '+228', flag: '🇹🇬', name: 'Togo' },
  { code: '+229', flag: '🇧🇯', name: 'Bénin' },
  { code: '+224', flag: '🇬🇳', name: 'Guinée' },
  { code: '+227', flag: '🇳🇪', name: 'Niger' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+243', flag: '🇨🇩', name: 'RD Congo' },
  { code: '+242', flag: '🇨🇬', name: 'Congo' },
  { code: '+241', flag: '🇬🇦', name: 'Gabon' },
  { code: '+235', flag: '🇹🇩', name: 'Tchad' },
  { code: '+212', flag: '🇲🇦', name: 'Maroc' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisie' },
  { code: '+213', flag: '🇩🇿', name: 'Algérie' },
  { code: '+44', flag: '🇬🇧', name: 'Royaume-Uni' },
  { code: '+49', flag: '🇩🇪', name: 'Allemagne' },
  { code: '+39', flag: '🇮🇹', name: 'Italie' },
  { code: '+34', flag: '🇪🇸', name: 'Espagne' },
  { code: '+32', flag: '🇧🇪', name: 'Belgique' },
  { code: '+41', flag: '🇨🇭', name: 'Suisse' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzanie' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+256', flag: '🇺🇬', name: 'Ouganda' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
}

export default function PhoneInput({ value, onChange }: PhoneInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');

  // Parse country code from value
  const { selectedCountry, localNumber } = useMemo(() => {
    // Try to match existing country code from value
    const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (value.startsWith(c.code)) {
        return { selectedCountry: c, localNumber: value.slice(c.code.length).trim() };
      }
    }
    return { selectedCountry: COUNTRIES[0], localNumber: value.replace(/^\+\d+\s*/, '') };
  }, [value]);

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setShowDropdown(false);
    setSearch('');
    onChange(`${country.code}${localNumber}`);
  };

  const handleLocalChange = (local: string) => {
    // Only allow digits and spaces
    const cleaned = local.replace(/[^\d\s]/g, '');
    onChange(`${selectedCountry.code}${cleaned}`);
  };

  const filtered = search
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search))
    : COUNTRIES;

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        {/* Country selector */}
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="h-12 px-2.5 rounded-lg border border-input bg-background flex items-center gap-1 shrink-0 hover:bg-accent transition-colors"
        >
          <span className="text-lg">{selectedCountry.flag}</span>
          <span className="text-xs text-muted-foreground font-medium">{selectedCountry.code}</span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>

        {/* Phone number input */}
        <Input
          type="tel"
          placeholder="07 XX XX XX XX"
          value={localNumber}
          onChange={e => handleLocalChange(e.target.value)}
          className="h-12 flex-1"
          autoComplete="tel-national"
        />
      </div>

      {/* Country dropdown */}
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setShowDropdown(false); setSearch(''); }} />
          <div className="absolute top-14 left-0 z-50 w-full bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-border">
              <Input
                placeholder="Rechercher un pays..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 text-sm"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filtered.map(c => (
                <button
                  key={c.code + c.name}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors text-sm ${
                    c.code === selectedCountry.code ? 'bg-primary/5 text-primary font-medium' : 'text-foreground'
                  }`}
                >
                  <span className="text-lg">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
