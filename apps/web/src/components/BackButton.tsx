import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  fallback?: string;
  label?: string;
}

export default function BackButton({ fallback = '/app', label }: Props) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors py-1 -ml-1"
    >
      <ArrowLeft size={18} strokeWidth={2} />
      {label && <span className="text-sm font-medium">{label}</span>}
    </button>
  );
}
