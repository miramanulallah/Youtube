
import React, { ReactNode, ErrorInfo, Component } from 'react';
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
 * Explicitly using Component from named imports to ensure generic types are correctly resolved.
 */
// Fix: Use Component directly from 'react' to ensure generic arguments are correctly inherited by the class.
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // Standard state initialization for class components.
    // Fix: Correctly initializes state property which is now recognized by the compiler via generic inheritance.
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
    // Fix: Accesses state property from the generic Component base class.
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#09090b', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }

    // Return the child components.
    // Fix: Accesses props.children from the generic Component base class.
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
