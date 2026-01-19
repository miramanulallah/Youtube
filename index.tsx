
import React, { ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary captures errors from children and provides a fallback UI.
 */
// Fix: Use React.Component explicitly to ensure that the TypeScript compiler correctly associates the generic Props and State types with the component instance.
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // Standard state initialization for class components.
    // Fix: Properly initialize state on the instance which is now recognized due to correct generic inheritance.
    this.state = {
      hasError: false,
      error: null
    };
  }

  // Static method used to update state after an error is detected.
  // This is called during the render phase.
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Lifecycle method called after an error is caught for reporting or logging.
  // This is called during the commit phase.
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // If an error occurred, render the designated fallback UI.
    // Fix: Accesses state property which is now correctly inherited from React.Component.
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#09090b', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }

    // Return the child components.
    // Fix: Accesses props property which is now correctly inherited from React.Component.
    return this.props.children || null;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
