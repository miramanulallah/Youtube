
import React, { Component, ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fixed ErrorBoundary by using class property for state and direct Component inheritance.
// This ensures that 'props' and 'state' are correctly typed and recognized through inheritance,
// resolving errors where these properties were reported as missing on the ErrorBoundary instance.
class ErrorBoundary extends Component<Props, State> {
  // Initializing state as a class property for better type inference in various environments.
  public state: State = {
    hasError: false,
    error: null
  };

  // This static method is called during the render phase to update state after an error is thrown.
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // This lifecycle method is called during the commit phase for error reporting.
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Access state through this.state, which is now properly inherited and typed.
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#09090b', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }

    // Access props through this.props, which is now properly recognized through inheritance.
    return this.props.children;
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
