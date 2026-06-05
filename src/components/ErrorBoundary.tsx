// ErrorBoundary catches any uncaught React error and shows a friendly fallback
// instead of a white screen. Sits at the top of the component tree.

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to the console for the developer. A future iteration could
    // POST this to /api/logs for server-side observability.
    console.error("[LammaChat ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          dir="rtl"
          className="min-h-screen w-full flex items-center justify-center p-4 font-sans lamma-fallback-shell"
        >
          <div className="max-w-md w-full rounded-3xl p-6 lamma-fallback-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center lamma-soft-danger">
                <AlertTriangle className="text-red-400" size={24} />
              </div>
              <h1 className="text-xl font-black text-white">
                حدث خطأ غير متوقع
              </h1>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              حصل خطأ في التطبيق. تقدر تحاول تحدث الصفحة أو ترجع للرئيسية.
              لو المشكلة فضلت، ابعتلنا صورة من الرسالة اللي تحت.
            </p>

            {this.state.error && (
              <details className="mb-4 rounded-xl p-3 lamma-soft-danger">
                <summary className="text-xs font-bold text-red-300 cursor-pointer">
                  تفاصيل الخطأ (للمطورين)
                </summary>
                <pre className="mt-2 text-[10px] text-gray-400 overflow-x-auto whitespace-pre-wrap break-all" dir="ltr">
                  {this.state.error.name}: {this.state.error.message}
                  {this.state.errorInfo?.componentStack
                    ? `\n\n${this.state.errorInfo.componentStack}`
                    : ""}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 rounded-xl text-emerald-300 text-sm font-bold transition-all cursor-pointer lamma-toggle-on"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 lamma-soft-action"
              >
                <RefreshCw size={14} />
                تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
