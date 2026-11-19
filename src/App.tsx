import React, { useState } from 'react';
import { Gamepad2, RefreshCw } from 'lucide-react';
import { Home } from './components/Home';
import { LoginProfessor } from './components/LoginProfessor';
import { PainelProfessor } from './components/PainelProfessor';
import { ArenaAlunos } from './components/ArenaAlunos';
import { isFirebaseConfigured } from './firebase';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [view, setView] = useState<'home' | 'login_professor' | 'painel_professor' | 'arena_alunos'>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <div className="min-h-screen bg-[#031317] bg-grid-pattern text-white font-sans flex flex-col selection:bg-amber-400 selection:text-slate-950 relative overflow-x-hidden">
      
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between z-50 border-b border-cyan-950">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Gamepad2 className="w-6 h-6 text-slate-950" />
          </div>
          <h1 className="text-xl font-black tracking-wider text-amber-400">
            ARENA DE JOGOS
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${isFirebaseConfigured ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/40 text-red-300'}`}>
            {isFirebaseConfigured ? '🟢 Firebase Conectado' : '🔴 Firebase Não Configurado'}
          </span>
        </div>
      </header>

      {/* Main Container / Views */}
      <main className="flex-1 flex flex-col z-10 w-full">
        <ErrorBoundary>
          {!isFirebaseConfigured && (
            <div className="bg-red-600 text-white text-xs font-bold text-center py-2 px-4">
              Firebase não configurado. Preencha as variáveis de ambiente no arquivo .env.
            </div>
          )}

          {view === 'home' && (
            <Home
              onGoProfessor={() => setView(isLoggedIn ? 'painel_professor' : 'login_professor')}
              onGoAlunos={() => setView('arena_alunos')}
            />
          )}

          {view === 'login_professor' && (
            <LoginProfessor
              onLoginSuccess={() => {
                setIsLoggedIn(true);
                setView('painel_professor');
              }}
              onBack={() => setView('home')}
            />
          )}

          {view === 'painel_professor' && (
            <PainelProfessor
              onLogout={() => {
                setIsLoggedIn(false);
                setView('home');
              }}
            />
          )}

          {view === 'arena_alunos' && (
            <ArenaAlunos
              onBack={() => setView('home')}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-950 py-4 text-center text-xs text-cyan-400/60 z-10">
        Arena de Jogos &bull; Sistema de Salas e Cadeiras em Tempo Real com Firebase Firestore
      </footer>

    </div>
  );
}
