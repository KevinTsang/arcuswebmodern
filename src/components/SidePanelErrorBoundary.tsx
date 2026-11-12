'use client';

/**
 * SidePanelErrorBoundary — catches a panel that throws while rendering,
 * including a promise passed to `use()` that rejects, so a broken panel
 * shows a message under the panel header instead of unmounting the app.
 *
 * Panel loaders catch their own expected failures; this is the backstop.
 * SidePanelFrame keys it by the panel key, so opening different content
 * mounts a new boundary and clears the error.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface SidePanelErrorBoundaryProps {
  testId: string;
  children: ReactNode;
}

interface SidePanelErrorBoundaryState {
  error: boolean;
}

export class SidePanelErrorBoundary extends Component<SidePanelErrorBoundaryProps, SidePanelErrorBoundaryState> {
  state: SidePanelErrorBoundaryState = { error: false };

  static getDerivedStateFromError(): SidePanelErrorBoundaryState {
    return { error: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Side panel failed to render:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <p data-testid={this.props.testId} className="text-sm text-cardinal">
          Something went wrong loading this panel. Close it and try again.
        </p>
      );
    }
    return this.props.children;
  }
}
