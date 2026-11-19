import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] text-white space-y-4">
          <div className="bg-red-500/20 border border-red-500/40 p-8 rounded-3xl max-w-md space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-red-300">Ops! Ocorreu um erro inesperado.</h2>
            <p className="text-xs text-emerald-200/80">
              {this.state.error?.message || 'Erro desconhecido na renderização.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 mx-auto transition shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recarregar Página</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
