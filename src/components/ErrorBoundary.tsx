import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ZexAI ErrorBoundary] Caught error:', error);
    console.error('[ZexAI ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060612] text-white flex items-center justify-center">
          <div className="text-center max-w-md p-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-500/20 to-indigo-500/20 flex items-center justify-center">
              <span className="text-4xl">⚡</span>
            </div>
            <h2 className="text-2xl font-bold mb-3">ZexAI</h2>
            <p className="text-gray-400 mb-6 text-sm">
              A temporary rendering issue occurred. Please refresh the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold text-sm transition-all active:scale-95"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
