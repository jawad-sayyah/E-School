import { Component, type ReactNode } from 'react';

interface PanelBoundaryProps {
  children: ReactNode;
  /** Called once after a crash. Rebuild the sandbox here (e.g. remount its provider). */
  onCrash: () => void;
}

/**
 * Sandpack's test panel crashes when a test run starts while the previous one is still
 * reporting (it gets results for a file it has just forgotten). Without a boundary that takes
 * the whole lesson page down. With this one, only the panel is replaced, and `onCrash` lets
 * the owner rebuild the sandbox: a remounted panel alone never initializes again.
 */
export class PanelBoundary extends Component<PanelBoundaryProps, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('The Sandpack test panel crashed; rebuilding the sandbox:', error);
    setTimeout(() => this.props.onCrash(), 0);
  }

  render() {
    if (this.state.crashed) {
      return (
        <p role="status" className="p-3 text-sm text-muted-foreground">
          Restarting the tests…
        </p>
      );
    }
    return this.props.children;
  }
}
