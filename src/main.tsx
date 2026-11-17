import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProgressProvider } from '@/progress/ProgressContext';
import { LocalProgressStore } from '@/progress/LocalProgressStore';
import { router } from './router';
import './index.css';

// Swap this for a Supabase-backed ProgressStore later; components don't change.
const progressStore = new LocalProgressStore();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <TooltipProvider delayDuration={400}>
        <ProgressProvider store={progressStore}>
          <RouterProvider router={router} />
        </ProgressProvider>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
