import React, { useState, useEffect } from 'react';
import { ArrowLeft, Key, Armchair, RefreshCw, LogOut, Gamepad2 } from 'lucide-react';
import { collection, doc, getDoc, updateDoc, onSnapshot, runTransaction } from 'firebase/firestore';
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
  const [step, setStep] = useState<'list' | 'pin' | 'profile' | 'grid' | 'arena_hub' | 'play_jogo_cores'>('list');

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

  const [score, setScore] = useState(0);

  // Jogo das Cores student state for round locking
  const [lastRodadaAnswered, setLastRodadaAnswered] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; correct: boolean } | null>(null);

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

        // Check session and chair occupancy (expulsion check)
        const savedSalaId = sessionStorage.getItem('arena_my_sala');
        const savedChairId = sessionStorage.getItem('arena_my_chair');
        if (savedSalaId && savedChairId) {
          const found = list.find(s => s.id === savedSalaId);
          if (found) {
            const chair = found.cadeiras?.find((c: any) => c.id === Number(savedChairId));
            if (!chair || !chair.ocupada) {
              sessionStorage.removeItem('arena_my_sala');
              sessionStorage.removeItem('arena_my_chair');
              setMySalaId(null);
              setMyChairId(null);
              setScore(0);
              setSelectedSala(found);
              setStep('grid');
              alert('Você foi liberado da cadeira pelo professor.');
            } else {
              setSelectedSala(found);
              setMySalaId(savedSalaId);
              setMyChairId(Number(savedChairId));
              setNome(chair.nomeAluno || '');
              setAvatar(chair.avatar || '🦁');
              if (typeof chair.score === 'number') {
                setScore(chair.score);
              }
            }
          }
        } else if (selectedSala) {
          const foundCurrent = list.find(s => s.id === selectedSala.id);
          if (foundCurrent) {
            setSelectedSala(foundCurrent);
            if (myChairId) {
              const myChair = foundCurrent.cadeiras?.find((c: any) => c.id === myChairId);
              if (!myChair || !myChair.ocupada) {
                sessionStorage.removeItem('arena_my_sala');
                sessionStorage.removeItem('arena_my_chair');
                setMySalaId(null);
                setMyChairId(null);
                setScore(0);
                setStep('grid');
                alert('Você foi liberado da cadeira pelo professor.');
              } else if (myChair && typeof myChair.score === 'number') {
                setScore(myChair.score);
              }
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
    if (pinInput.trim() === String(selectedSala?.pin || '1234')) {
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
            avatar: avatar,
            score: score || 0
          };
        }
        return c;
      });

      await updateDoc(doc(db as any, 'salas', selectedSala.id), {
        cadeiras: updatedCadeiras
      });

      sessionStorage.setItem('arena_my_sala', selectedSala.id);
      sessionStorage.setItem('arena_my_chair', String(chairId));
      setMySalaId(selectedSala.id);
      setMyChairId(chairId);

      setStep('arena_hub');
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
            return { id: c.id, ocupada: false, nomeAluno: '', avatar: '', score: 0 };
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
      setScore(0);
      setStep('grid');
    } catch (err) {
      console.error("Erro ao sair da cadeira:", err);
    }
  };

  const addScorePoints = async (points: number) => {
    const newScore = score + points;
    setScore(newScore);
    if (!mySalaId || !myChairId || !db) return;
    try {
      await runTransaction(db as any, async (transaction: any) => {
        const salaRef = doc(db as any, 'salas', mySalaId);
        const salaDoc = await transaction.get(salaRef);
        if (!salaDoc.exists()) return;
        const salaData = salaDoc.data();
        const updatedCadeiras = (salaData.cadeiras || []).map((c: any) => {
          if (c.id === myChairId) {
            return { ...c, score: newScore };
          }
          return c;
        });
        transaction.update(salaRef, { cadeiras: updatedCadeiras });
      });
    } catch (err) {
      console.error("Erro ao atualizar placar em transação:", err);
    }
  };

  const currentRodadaId = selectedSala?.rodadaId || 0;
  const hasAnsweredCurrentRodada = lastRodadaAnswered === currentRodadaId;
  const corEscolhidaProfessor = selectedSala?.corRodada ? selectedSala.corRodada.toUpperCase() : '...';

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

          {/* STEP 4: CHAIR GRID */}
          {step === 'grid' && selectedSala && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-cyan-900/60">
                <div>
                  <h3 className="text-2xl font-black text-white">{selectedSala.nome}</h3>
                  <p className="text-xs text-cyan-300/80 mt-0.5">
                    Aluno: <strong className="text-amber-400">{avatar} {nome}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setStep('list')}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs"
                >
                  ← Trocar de Sala
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-cyan-300 mb-4">
                  👉 Clique em uma cadeira livre (Verde) para sentar-se e entrar na <strong>Arena</strong>:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                  {selectedSala.cadeiras?.map((c: any) => {
                    const ocupada = c.ocupada;

                    return (
                      <button
                        key={c.id}
                        onClick={() => handleChooseChair(c.id)}
                        className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center space-y-1.5 transition ${ocupada ? 'bg-red-950/90 border-red-500 text-red-200 cursor-not-allowed opacity-90' : 'bg-slate-950 border-cyan-800/80 hover:bg-emerald-950 hover:border-emerald-400 text-cyan-200 shadow-md'}`}
                      >
                        <div className="flex items-center space-x-1">
                          <Armchair className={`w-4 h-4 ${ocupada ? 'text-red-400' : 'text-emerald-400'}`} />
                          <span className="text-xs font-black">#{c.id}</span>
                        </div>

                        {ocupada ? (
                          <div className="w-full space-y-0.5">
                            <span className="text-base block">{c.avatar || '🦁'}</span>
                            <span className="text-[10px] font-black truncate block text-amber-300 max-w-full">
                              {c.nomeAluno}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold py-1">Livre</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* STEP 5: ARENA HUB (JOGO DAS CORES) */}
          {step === 'arena_hub' && selectedSala && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-8">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-cyan-900/60">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center text-3xl shadow-lg">
                    {avatar}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{nome}</h3>
                    <p className="text-xs text-amber-400 font-bold">
                      {selectedSala.nome} &bull; Cadeira #{((myChairId ?? 0))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-xs uppercase text-cyan-300 font-bold block">Pontuação Atual</span>
                    <span className="text-2xl font-black text-amber-400">{score} pts</span>
                  </div>
                  <button
                    onClick={handleLeaveChair}
                    className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                    title="Sair da Cadeira"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 bg-[#052c1e] p-4 rounded-2xl border border-emerald-800 text-emerald-300 font-bold text-sm">
                  <Gamepad2 className="w-5 h-5 text-amber-400" />
                  <span>Jogo Ativo:</span>
                </div>

                {(() => {
                  const isUnlocked = selectedSala.jogoCoresLiberado === true;

                  return (
                    <div
                      onClick={() => {
                        if (!isUnlocked) {
                          alert('O Jogo das Cores está trancado pelo professor no momento.');
                          return;
                        }
                        setStep('play_jogo_cores');
                        setFeedbackMsg(null);
                      }}
                      className={`border p-8 rounded-3xl transition flex flex-col justify-between ${isUnlocked ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-white/30 cursor-pointer shadow-2xl transform hover:scale-102' : 'bg-slate-950/90 border-red-900/60 opacity-80 cursor-not-allowed'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-2xl font-black text-white mb-2">🎨 JOGO DAS CORES</h4>
                          <p className="text-sm text-white/90">Ouça o comando do professor, evite a cor escolhida e acumule pontos!</p>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${isUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                          {isUnlocked ? 'liberado 🔓' : 'trancado 🔒'}
                        </span>
                      </div>
                      <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between text-sm font-black text-white">
                        <span>{isUnlocked ? 'Jogar Agora ➔' : 'Aguardando Liberação do Professor'}</span>
                        <span className="text-amber-300">Sua Pontuação: {score} pts</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          {/* STEP 6: PLAY JOGO DAS CORES (TODAS AS CORES COM O NOME DA COR ESCOLHIDA PELO PROFESSOR) */}
          {step === 'play_jogo_cores' && selectedSala && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 max-w-2xl mx-auto w-full text-center">
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('arena_hub')}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs"
                >
                  ← Voltar
                </button>
                <div className="bg-amber-400/20 border border-amber-400/40 px-4 py-1.5 rounded-xl">
                  <span className="text-xs text-cyan-200 font-bold mr-2">Evolução:</span>
                  <span className="text-lg font-black text-amber-400">{score} pts</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="inline-block bg-purple-600/30 border border-purple-400 text-purple-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                  🎨 JOGO DAS CORES &bull; SALA: {selectedSala.nome}
                </div>

                {!selectedSala.corRodada ? (
                  <div className="text-sm text-cyan-300/80 bg-slate-950 p-8 rounded-2xl border border-cyan-900 space-y-2">
                    <p className="font-bold">Aguardando o professor escolher a cor no painel...</p>
                    <p className="text-xs text-cyan-400/60">Ouça o comando por voz do professor!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-slate-950 p-6 rounded-2xl border-2 border-purple-500/60 shadow-lg space-y-2">
                      <span className="text-xs uppercase font-black text-purple-300 tracking-wider block">🎤 Comando do Professor:</span>
                      <p className="text-sm font-black text-amber-400">
                        Todas as cores exibem: "{corEscolhidaProfessor}"
                      </p>
                      <p className="text-xs text-cyan-300/80">
                        ⚠️ Aperte a cor que o professor <strong>NÃO</strong> escolheu! (Certa: <strong className="text-emerald-400">+10 pts</strong> | Errada/Escolha do Prof: <strong className="text-red-400">-5 pts</strong>)
                      </p>
                      {hasAnsweredCurrentRodada ? (
                        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 font-bold text-xs">
                          🔒 1ª cor registrada! A 2ª cor está travada. Aguarde o professor mudar a cor para a próxima rodada.
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 font-bold text-xs">
                          🔓 Rodada Liberada! A 1ª cor que você apertar vale.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[
                        { key: 'vermelho', label: corEscolhidaProfessor, color: 'bg-red-600 hover:bg-red-500 text-white border-red-400' },
                        { key: 'azul', label: corEscolhidaProfessor, color: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400' },
                        { key: 'amarelo', label: corEscolhidaProfessor, color: 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 border-yellow-200' },
                        { key: 'verde', label: corEscolhidaProfessor, color: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400' },
                        { key: 'laranja', label: corEscolhidaProfessor, color: 'bg-orange-500 hover:bg-orange-400 text-white border-orange-400' },
                        { key: 'roxo', label: corEscolhidaProfessor, color: 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400' }
                      ].map((c) => (
                        <button
                          key={c.key}
                          disabled={hasAnsweredCurrentRodada}
                          onClick={() => {
                            if (hasAnsweredCurrentRodada) return;

                            setLastRodadaAnswered(currentRodadaId);
                            const prohibitedColor = selectedSala.corRodada;
                            const isProhibited = c.key === prohibitedColor;

                            if (isProhibited) {
                              addScorePoints(-5);
                              setFeedbackMsg({ text: `❌ Errou! Você clicou na cor escolhida pelo professor (${c.key.toUpperCase()})! -5 pts`, correct: false });
                            } else {
                              addScorePoints(10);
                              setFeedbackMsg({ text: `🎉 Acertou! Você escolheu a cor correta (${c.key.toUpperCase()})! +10 pts`, correct: true });
                              confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                            }
                          }}
                          className={`p-6 rounded-2xl border-4 font-black text-sm md:text-lg shadow-xl transition transform ${hasAnsweredCurrentRodada ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500' : `hover:scale-105 ${c.color}`}`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {feedbackMsg && (
                      <div className={`p-4 rounded-2xl font-black text-sm animate-bounce ${feedbackMsg.correct ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                        {feedbackMsg.text}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </>
      )}

    </div>
  );
};
