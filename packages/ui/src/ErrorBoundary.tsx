import { Component, type ComponentChildren } from 'preact';

interface ErrorBoundaryProps {
  children: ComponentChildren;
  fallback?: ComponentChildren;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch and handle errors gracefully
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentDidCatch(error: Error, errorInfo: any): void {
    console.error('Widget Error Boundary caught error:', error, errorInfo);
    
    this.setState({
      hasError: true,
      error,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div class="flex items-center justify-center h-full p-4 bg-red-50">
          <div class="text-center">
            <div class="text-red-600 text-lg font-semibold mb-2">
              Something went wrong
            </div>
            <div class="text-red-500 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
