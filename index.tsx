
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface Props {
  children?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fixed ErrorBoundary by explicitly extending React.Component with Props and State.
// This ensures that 'this.props' and 'this.state' are correctly typed and recognized by the TypeScript compiler,
// resolving errors where these properties were reported as missing on the class instance.
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    // Explicitly initialize state which is now correctly inherited from React.Component.
    this.state = {
      hasError: false,
      error: null
    };
  }

  // This static method is called during the render phase to update state after an error is thrown.
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // This lifecycle method is called during the commit phase for error reporting.
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
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
