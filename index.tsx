
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

// ErrorBoundary captures errors from children and provides a fallback UI.
// Explicitly extending the Component class from React with generic Props and State types
// ensures that TypeScript correctly inherits 'this.props' and 'this.state'.
class ErrorBoundary extends Component<Props, State> {
  // Initializing state directly as a property. 
  // TypeScript correctly associates this with the State generic parameter.
  state: State = {
    hasError: false,
    error: null
  };

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
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#09090b', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }

    // Return the child components. 
    // Fallback to null to satisfy the ReactNode return type requirement if children are undefined.
    // Inheritance from Component ensures 'this.props' is available.
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
