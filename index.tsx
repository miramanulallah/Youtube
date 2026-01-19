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

// Fixed ErrorBoundary by extending the explicitly imported Component and ensuring correct generic typing.
// This resolves the TypeScript errors where 'props' and 'state' were not being recognized through inheritance.
class ErrorBoundary extends Component<Props, State> {
  // Initializing state in constructor. The inheritance from Component<Props, State> 
  // ensures this.props and this.state are correctly typed and recognized through inheritance.
  constructor(props: Props) {
    super(props);
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
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Accessing this.state which is now properly recognized through inheritance from Component.
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#09090b', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }

    // Accessing this.props which is now properly recognized through inheritance from Component.
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