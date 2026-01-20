
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
// Fix: Use React.Component directly and explicitly declare Props and State to ensure that the TypeScript compiler correctly associates the inherited 'props' and 'state' properties.
class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Explicitly declaring props as a class member helps the TypeScript compiler resolve it on the instance when inheritance visibility issues occur.
  props: Props;

  // Fix: Initializing state as a class property helps TypeScript resolve the 'state' property on the instance.
  state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
    // Fix: Explicitly assigning props in the constructor to ensure it's available on the instance.
    this.props = props;
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

  render(): ReactNode {
    // If an error occurred, render the designated fallback UI.
    // Fix: Accessing state which is now correctly inherited and recognized.
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#09090b', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.toString()}</p>
        </div>
      );
    }

    // Return the child components.
    // Fix: Accessing props correctly from the React.Component base class.
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
