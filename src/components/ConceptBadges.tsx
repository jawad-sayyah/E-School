import { Badge } from '@/components/ui/badge';

export function ReactBadge() {
  return (
    <Badge className="border-transparent bg-react-badge-bg font-sans text-[11px] font-semibold text-react-badge">
      Used in React
    </Badge>
  );
}

export function WarnBadge() {
  return (
    <Badge className="border-transparent bg-warn-badge-bg font-sans text-[11px] font-semibold text-warn-badge">
      Watch out
    </Badge>
  );
}
