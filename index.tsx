
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

// Fixed ErrorBoundary by extending React.Component<Props, State> directly.
// This ensures TypeScript correctly recognizes 'this.props' and 'this.state' through inheritance.
class ErrorBoundary extends React.Component<Props, State> {
  // Initializing state as a class property ensures it is correctly typed and associated with the component instance.
  state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
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
    // Accessing state which is now correctly inherited from React.Component<Props, State>.
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#09090b', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }

    // Accessing props which is now correctly inherited from React.Component<Props, State>.
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
