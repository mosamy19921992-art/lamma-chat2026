// ErrorBoundary catches any uncaught React error and shows a friendly fallback
// instead of a white screen. Sits at the top of the component tree.

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
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

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          dir="rtl"
          className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a0f0c] via-[#0c120d] to-[#0a0f0c] p-4 font-sans"
        >
          <div className="max-w-md w-full bg-[#0c120d]/95 border border-red-500/30 rounded-3xl shadow-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
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
              <details className="mb-4 bg-black/40 border border-red-500/20 rounded-xl p-3">
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
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm font-bold border border-emerald-500/30 transition-all cursor-pointer"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold border border-white/10 transition-all cursor-pointer flex items-center justify-center gap-2"
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
