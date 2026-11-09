import React, { useState, useEffect } from 'react';
import { ArrowLeft, Key, Armchair, RefreshCw, CheckCircle2, LogOut } from 'lucide-react';
import { collection, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import confetti from 'canvas-confetti';

interface ArenaAlunosProps {
  onBack: () => void;
}

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐵', '🦄', '🐲', '🤖', '👾', '🚀', '⚽'];

export const ArenaAlunos: React.FC<ArenaAlunosProps> = ({ onBack }) => {
  const [salas, setSalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSala, setSelectedSala] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [step, setStep] = useState<'list' | 'pin' | 'profile' | 'grid' | 'seated'>('list');

  const [nome, setNome] = useState('');
  const [avatar, setAvatar] = useState('🦁');
  const [myChairId, setMyChairId] = useState<number | null>(() => {
    try {
      const saved = sessionStorage.getItem('arena_my_chair');
      if (saved) return Number(saved);
    } catch (e) {}
    return null;
  });
  const [mySalaId, setMySalaId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('arena_my_sala');
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'salas'),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setSalas(list);
        setLoading(false);

        // If sessionStorage had seated state, restore active sala & step
        const savedSalaId = sessionStorage.getItem('arena_my_sala');
        const savedChairId = sessionStorage.getItem('arena_my_chair');
        if (savedSalaId && savedChairId) {
          const found = list.find(s => s.id === savedSalaId);
          if (found) {
            setSelectedSala(found);
            const chair = found.cadeiras?.find((c: any) => c.id === Number(savedChairId));
            if (chair && chair.ocupada) {
              setMySalaId(savedSalaId);
              setMyChairId(Number(savedChairId));
              setNome(chair.nomeAluno || '');
              setAvatar(chair.avatar || '🦁');
              setStep('seated');
            }
          }
        }
      },
      (err) => {
        console.error("Erro ao carregar salas:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSelectSala = (sala: any) => {
    setSelectedSala(sala);
    setPinInput('');
    setPinError('');
    setStep('pin');
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === String(selectedSala.pin || '1234')) {
      setPinError('');
      setStep('profile');
    } else {
      setPinError('PIN incorreto. Tente novamente.');
    }
  };

  const handleStartGrid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert('Digite seu nome.');
      return;
    }
    setStep('grid');
  };

  const handleChooseChair = async (chairId: number) => {
    if (!selectedSala || !db) return;

    try {
      const salaRef = doc(db, 'salas', selectedSala.id);
      
      // Fetch latest document to verify real-time availability
      const docSnap = await getDoc(salaRef);
      if (!docSnap.exists()) {
        alert('Esta sala não existe mais.');
        setStep('list');
        return;
      }

      const salaData = docSnap.data();
      const targetChair = salaData.cadeiras?.find((c: any) => c.id === chairId);

      if (!targetChair) return;

      if (targetChair.ocupada) {
        alert('Essa cadeira acabou de ser ocupada por outro aluno. Escolha outra.');
        return;
      }

      const updatedCadeiras = salaData.cadeiras.map((c: any) => {
        if (c.id === chairId) {
          return {
            id: c.id,
            ocupada: true,
            nomeAluno: nome.trim(),
            avatar: avatar
          };
        }
        return c;
      });

      await updateDoc(salaRef, {
        cadeiras: updatedCadeiras
      });

      sessionStorage.setItem('arena_my_sala', selectedSala.id);
      sessionStorage.setItem('arena_my_chair', String(chairId));
      setMySalaId(selectedSala.id);
      setMyChairId(chairId);
      setStep('seated');
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      console.error("Erro ao ocupar cadeira:", err);
      alert('Erro ao tentar ocupar a cadeira. Tente novamente.');
    }
  };

  const handleLeaveChair = async () => {
    if (!mySalaId || !myChairId || !db) return;

    try {
      const salaRef = doc(db, 'salas', mySalaId);
      const docSnap = await getDoc(salaRef);
      if (docSnap.exists()) {
        const salaData = docSnap.data();
        const updatedCadeiras = salaData.cadeiras.map((c: any) => {
          if (c.id === myChairId) {
            return { id: c.id, ocupada: false, nomeAluno: '', avatar: '' };
          }
          return c;
        });

        await updateDoc(salaRef, {
          cadeiras: updatedCadeiras
        });
      }

      sessionStorage.removeItem('arena_my_sala');
      sessionStorage.removeItem('arena_my_chair');
      setMySalaId(null);
      setMyChairId(null);
      setStep('grid');
    } catch (err) {
      console.error("Erro ao sair da cadeira:", err);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-500/20 border border-red-500/40 p-6 rounded-3xl max-w-md space-y-4">
          <h2 className="text-xl font-black text-red-300">Firebase não configurado</h2>
          <p className="text-xs text-cyan-200">Preencha as variáveis de ambiente no arquivo .env ou nas configurações do Vercel.</p>
          <button onClick={onBack} className="px-6 py-2.5 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full max-w-5xl mx-auto py-8 px-4 space-y-6">
      
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-3 rounded-2xl bg-[#07262c] border border-cyan-500/30 text-cyan-300 hover:bg-[#0a353d] transition flex items-center space-x-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Início</span>
        </button>

        <h2 className="text-xl md:text-2xl font-black text-amber-400">ARENA DE JOGOS &bull; ALUNOS</h2>

        <button
          onClick={() => setSalas([...salas])}
          className="p-3 rounded-2xl bg-[#07262c] border border-cyan-500/30 text-cyan-300 hover:bg-[#0a353d] transition"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-cyan-300 font-bold animate-pulse">Carregando salas disponíveis...</div>
      ) : (
        <>
          {/* STEP 1: LISTA DE SALAS */}
          {step === 'list' && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
              <div>
                <h3 className="text-2xl font-black text-white">Salas Disponíveis</h3>
                <p className="text-xs text-cyan-300/70 mt-1">Escolha uma sala abaixo para entrar</p>
              </div>

              {salas.length === 0 ? (
                <div className="text-center py-16 text-cyan-300/60 font-medium bg-slate-950 rounded-2xl border border-cyan-900/50">
                  Nenhuma sala disponível ainda. Aguarde o professor criar uma sala.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {salas.map((sala) => {
                    const ocupadas = sala.cadeiras?.filter((c: any) => c.ocupada).length || 0;
                    const total = sala.cadeiras?.length || 0;

                    return (
                      <div
                        key={sala.id}
                        onClick={() => handleSelectSala(sala)}
                        className="bg-slate-950 border border-cyan-500/40 hover:border-amber-400 p-6 rounded-2xl cursor-pointer shadow-lg transition transform hover:scale-102 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-amber-400 bg-slate-900 px-3 py-1 rounded-xl">
                              PIN: {sala.pin || '1234'}
                            </span>
                            <span className="text-xs text-cyan-300 font-bold">
                              {ocupadas}/{total} Cadeiras
                            </span>
                          </div>
                          <h4 className="text-xl font-black text-white">{sala.nome}</h4>
                        </div>

                        <div className="mt-4 pt-3 border-t border-cyan-900/50 flex items-center justify-between text-amber-400 font-bold text-sm">
                          <span>Entrar na Sala ➔</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PIN VERIFICATION */}
          {step === 'pin' && selectedSala && (
            <div className="max-w-md mx-auto w-full bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
                  <Key className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-2xl font-black text-white">{selectedSala.nome}</h3>
                <p className="text-sm text-cyan-300/70 mt-1">Digite o PIN (senha) fornecido pelo professor</p>
              </div>

              {pinError && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs font-bold text-red-300 text-center">
                  {pinError}
                </div>
              )}

              <form onSubmit={handleVerifyPin} className="space-y-4">
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-center text-2xl tracking-widest text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-mono"
                />

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl transition"
                >
                  Verificar PIN ➔
                </button>

                <button
                  type="button"
                  onClick={() => setStep('list')}
                  className="w-full py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-sm transition"
                >
                  Voltar às Salas
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: NOME & AVATAR PROFILE */}
          {step === 'profile' && selectedSala && (
            <div className="max-w-md mx-auto w-full bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-black text-white">Seu Perfil de Aluno</h3>
                <p className="text-sm text-cyan-300/70 mt-1">Digite seu nome e escolha seu avatar favorito</p>
              </div>

              <form onSubmit={handleStartGrid} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Seu Nome</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Escolha seu Avatar</label>
                  <div className="grid grid-cols-6 gap-2 bg-slate-950 p-3 rounded-2xl border border-cyan-900/60">
                    {AVATARS.map(av => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setAvatar(av)}
                        className={`text-2xl p-3 rounded-xl border transition ${avatar === av ? 'bg-amber-400/30 border-amber-400 scale-110 shadow-lg' : 'bg-[#07262c] border-cyan-900 hover:bg-[#0a353d]'}`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl transition"
                >
                  Ver Cadeiras da Sala ➔
                </button>
              </form>
            </div>
          )}

          {/* STEP 4 & 6 & 7: CHAIR GRID (VERDE = LIVRE, VERMELHO = OCUPADA) */}
          {(step === 'grid' || step === 'seated') && selectedSala && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-cyan-900/60">
                <div>
                  <h3 className="text-2xl font-black text-white">{selectedSala.nome}</h3>
                  <p className="text-xs text-cyan-300/80 mt-0.5">
                    Aluno: <strong className="text-amber-400">{avatar} {nome}</strong>
                  </p>
                </div>

                {step === 'seated' && (
                  <button
                    onClick={handleLeaveChair}
                    className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg transition flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair da Minha Cadeira</span>
                  </button>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-cyan-300 mb-4">
                  {step === 'seated' 
                    ? '✨ Você está sentado! Sua cadeira está destacada em amarelo abaixo.' 
                    : '👉 Clique em uma cadeira livre (Verde) para sentar-se:'}
                </p>

                {/* Real-time sync grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                  {selectedSala.cadeiras?.map((c: any) => {
                    const isMyChair = step === 'seated' && c.id === myChairId;
                    const ocupada = c.ocupada;

                    return (
                      <button
                        key={c.id}
                        disabled={step === 'seated'}
                        onClick={() => handleChooseChair(c.id)}
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center space-y-1.5 transition ${isMyChair ? 'bg-amber-400 border-yellow-200 text-slate-950 ring-4 ring-amber-300 scale-105 shadow-xl' : ocupada ? 'bg-red-950/90 border-red-500 text-red-200 cursor-not-allowed opacity-90' : 'bg-slate-950 border-cyan-800/80 hover:bg-emerald-950 hover:border-emerald-400 text-cyan-200 shadow-md'}`}
                      >
                        <div className="flex items-center space-x-1">
                          <Armchair className={`w-4 h-4 ${isMyChair ? 'text-slate-950' : ocupada ? 'text-red-400' : 'text-emerald-400'}`} />
                          <span className="text-xs font-black">#{c.id}</span>
                        </div>

                        {ocupada ? (
                          <div className="w-full space-y-0.5">
                            <span className="text-base block">{c.avatar || '🦁'}</span>
                            <span className={`text-[10px] font-black truncate block max-w-full ${isMyChair ? 'text-slate-950' : 'text-amber-300'}`}>
                              {c.nomeAluno}
                            </span>
                            {isMyChair && <span className="text-[9px] uppercase font-black bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded">Sua Cadeira</span>}
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold py-1">Livre</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-cyan-900/50 flex justify-between items-center text-xs text-cyan-300/70">
                <button
                  onClick={() => {
                    if (step === 'seated') {
                      if (confirm('Deseja realmente sair da sala? Sua cadeira será liberada.')) {
                        handleLeaveChair();
                        setStep('list');
                      }
                    } else {
                      setStep('list');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 hover:bg-slate-900 font-bold"
                >
                  ← Voltar para Lista de Salas
                </button>
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
};
