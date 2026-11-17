import {
  BrainIcon,
  BugIcon,
  CalendarCheckIcon,
  CheckCheckIcon,
  CpuIcon,
  EyeIcon,
  FlameIcon,
  FootprintsIcon,
  GraduationCapIcon,
  PuzzleIcon,
  StarIcon,
  TrophyIcon,
  type LucideIcon,
} from 'lucide-react';
import type { Badge } from '@/gamification/rules';

export const BADGE_ICONS: Record<Badge['icon'], LucideIcon> = {
  footprints: FootprintsIcon,
  check: CheckCheckIcon,
  puzzle: PuzzleIcon,
  cpu: CpuIcon,
  star: StarIcon,
  bug: BugIcon,
  eye: EyeIcon,
  brain: BrainIcon,
  flame: FlameIcon,
  calendar: CalendarCheckIcon,
  trophy: TrophyIcon,
  graduation: GraduationCapIcon,
};
