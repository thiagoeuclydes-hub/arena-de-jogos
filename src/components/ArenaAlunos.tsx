import React, { useState, useEffect } from 'react';
import { ArrowLeft, Key, Armchair, RefreshCw, CheckCircle2, LogOut, Gamepad2, Lock, Unlock, Trophy, XCircle } from 'lucide-react';
import { collection, doc, getDoc, updateDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import confetti from 'canvas-confetti';

interface ArenaAlunosProps {
  onBack: () => void;
}

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐸', '🐵', '🦄', '🐲', '🤖', '👾', '🚀', '⚽'];

// Sample questions for the 3 games
const QUIZ_QUESTIONS = [
  { question: "Qual é o maior país do mundo em território?", options: ["Canadá", "China", "Rússia", "Estados Unidos"], correctIndex: 2 },
  { question: "Em qual continente fica o Deserto do Saara?", options: ["Ásia", "África", "Oceania", "América do Sul"], correctIndex: 1 },
  { question: "Qual a fórmula química da água?", options: ["H2O", "CO2", "NaCl", "O2"], correctIndex: 0 }
];

const VF_QUESTIONS = [
  { statement: "A Terra é redonda (formato geoide).", isTrue: true },
  { statement: "O Sol gira em torno da Terra.", isTrue: false },
  { statement: "A água ferve a 100°C ao nível do mar.", isTrue: true }
];

const FORCA_WORDS = [
  { word: "GEOGRAFIA", hint: "Estudo da Terra e mapas" },
  { word: "CIENCIAS", hint: "Estudo da natureza e experimentos" },
  { word: "PLANETA", hint: "Corpo celeste que orbita uma estrela" }
];

export const ArenaAlunos: React.FC<ArenaAlunosProps> = ({ onBack }) => {
  const [salas, setSalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSala, setSelectedSala] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [step, setStep] = useState<'list' | 'pin' | 'profile' | 'grid' | 'arena_hub' | 'play_game'>('list');

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

  // Game state
  const [activeGame, setActiveGame] = useState<'quiz' | 'forca' | 'verdadeiro_falso' | 'jogo_das_cores' | 'stop_adedonha'>('quiz');
  const [score, setScore] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredResult, setAnsweredResult] = useState<boolean | null>(null);
  const [feedbackColorMsg, setFeedbackColorMsg] = useState<string | null>(null);

  // Forca game state
  const [forcaIdx, setForcaIdx] = useState(0);
  const [guessedLetters, setGuessedLetters] = useState<string[]>([]);

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

      // REDIRECIONADO À ARENA DE JOGOS APÓS CLICAR NA CADEIRA
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

  const jogoLiberado = selectedSala?.jogoLiberado === true;

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

          {/* STEP 4: CHAIR GRID (AO CLICAR NA CADEIRA -> REDIRECIONADO À ARENA DE JOGOS) */}
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
                  👉 Clique em uma cadeira livre (Verde) para sentar-se e ir para a <strong>Arena de Jogos</strong>:
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

          {/* STEP 5: ARENA DE JOGOS HUB (EXIGE LIBERAÇÃO DO PROFESSOR) */}
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
                    <span className="text-xs uppercase text-cyan-300 font-bold block">Pontuação</span>
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

              {/* GAMES LIST WITH LIVE LIBERADO / TRANCADO STATUS */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 bg-[#052c1e] p-4 rounded-2xl border border-emerald-800 text-emerald-300 font-bold text-sm">
                  <Gamepad2 className="w-5 h-5 text-amber-400" />
                  <span>Selecione um jogo liberado pelo professor:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'jogo_das_cores', title: 'JOGO DAS CORES', desc: 'Não aperte na cor proibida', color: 'from-purple-600 to-pink-600' },
                    { id: 'verdadeiro_falso', title: 'VERDADEIRO OU FALSO', desc: 'Afirmações rápidas', color: 'from-emerald-600 to-teal-600' },
                    { id: 'quiz', title: 'QUIZ', desc: 'Múltipla escolha de conhecimentos', color: 'from-blue-600 to-cyan-600' },
                    { id: 'forca', title: 'JOGO DA FORCA', desc: 'Adivinhe a palavra secreta', color: 'from-amber-600 to-yellow-600' },
                    { id: 'stop_adedonha', title: 'STOP / ADEDONHA', desc: 'Em construção', color: 'from-slate-700 to-slate-800' }
                  ].map((g) => {
                    const statusMap = selectedSala.jogosStatus || {};
                    const isUnlocked = statusMap[g.id] === true || (selectedSala.jogoLiberado && selectedSala.jogoAtivo === g.id);

                    return (
                      <div
                        key={g.id}
                        onClick={() => {
                          if (!isUnlocked) {
                            alert('Este jogo está trancado pelo professor no momento.');
                            return;
                          }
                          setActiveGame(g.id as any);
                          setStep('play_game');
                          setQuestionIdx(0);
                          setSelectedAnswer(null);
                          setAnsweredResult(null);
                          setFeedbackColorMsg(null);
                        }}
                        className={`border p-6 rounded-3xl transition flex flex-col justify-between ${isUnlocked ? `bg-gradient-to-br ${g.color} border-white/30 cursor-pointer shadow-xl transform hover:scale-102` : 'bg-slate-950/90 border-red-900/60 opacity-80 cursor-not-allowed'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-base font-black text-white mb-1">{g.title}</h4>
                            <p className="text-xs text-white/80">{g.desc}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                            {isUnlocked ? 'liberado' : 'trancado'}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-black text-white">
                          <span>{isUnlocked ? 'Jogar Agora ➔' : 'Trancado pelo Professor'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* STEP 6: PLAY ACTIVE GAME (QUIZ, FORCA, V/F) */}
          {step === 'play_game' && selectedSala && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 max-w-2xl mx-auto w-full text-center">
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('arena_hub')}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs"
                >
                  ← Voltar aos Jogos
                </button>
                <span className="text-amber-400 font-black">{score} pts</span>
              </div>

              {/* JOGO DAS CORES GAME */}
              {activeGame === 'jogo_das_cores' && (
                <div className="space-y-6">
                  <div className="inline-block bg-purple-600/30 border border-purple-400 text-purple-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                    JOGO DAS CORES &bull; SUA PLACAR: {score} PTS
                  </div>

                  {!selectedSala.corProibida ? (
                    <div className="text-sm text-cyan-300/80 bg-slate-950 p-6 rounded-2xl border border-cyan-900">
                      Aguardando o professor escolher a cor no painel dele...
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-cyan-300">
                        Escolha uma cor abaixo (+10 pts por acerto, -5 pts por erro):
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[
                          { key: 'vermelho', label: 'Vermelho', color: 'bg-red-600 hover:bg-red-500 text-white border-red-400' },
                          { key: 'azul', label: 'Azul', color: 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400' },
                          { key: 'amarelo', label: 'Amarelo', color: 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 border-yellow-200' },
                          { key: 'verde', label: 'Verde', color: 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400' },
                          { key: 'laranja', label: 'Laranja', color: 'bg-orange-500 hover:bg-orange-400 text-white border-orange-400' },
                          { key: 'roxo', label: 'Roxo', color: 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400' }
                        ].map((c) => (
                          <button
                            key={c.key}
                            onClick={() => {
                              const isForbidden = c.key === selectedSala.corProibida;
                              if (isForbidden) {
                                addScorePoints(-5);
                                setAnsweredResult(false);
                                setFeedbackColorMsg(`❌ Errou! Cor proibida (${c.label})! -5 pts`);
                              } else {
                                addScorePoints(10);
                                setAnsweredResult(true);
                                setFeedbackColorMsg(`🎉 Acertou! Escolheu ${c.label}! +10 pts`);
                                confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
                              }
                            }}
                            className={`p-6 rounded-2xl border-4 font-black text-lg shadow-xl transition transform hover:scale-105 ${c.color}`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>

                      {feedbackColorMsg && (
                        <div className={`p-4 rounded-2xl font-black text-sm animate-bounce ${answeredResult ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                          {feedbackColorMsg}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* QUIZ GAME */}
              {activeGame === 'quiz' && (
                <div className="space-y-6">
                  <div className="inline-block bg-blue-600/30 border border-blue-400 text-blue-300 text-xs font-bold px-3 py-1 rounded-full">
                    Quiz &bull; Pergunta {questionIdx + 1} de {QUIZ_QUESTIONS.length}
                  </div>

                  <h3 className="text-2xl font-black text-white">
                    {QUIZ_QUESTIONS[questionIdx].question}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {QUIZ_QUESTIONS[questionIdx].options.map((opt, idx) => (
                      <button
                        key={idx}
                        disabled={answeredResult !== null}
                        onClick={() => {
                          setSelectedAnswer(idx);
                          const correct = idx === QUIZ_QUESTIONS[questionIdx].correctIndex;
                          setAnsweredResult(correct);
                          if (correct) {
                            addScorePoints(10);
                            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                          }
                        }}
                        className={`p-5 rounded-2xl border-2 font-bold text-white transition ${selectedAnswer === idx ? (answeredResult ? 'bg-emerald-600 border-emerald-400' : 'bg-red-600 border-red-400') : 'bg-slate-950 border-cyan-800 hover:bg-cyan-950'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {answeredResult !== null && (
                    <div className="space-y-4">
                      <div className={`p-3 rounded-2xl font-bold text-sm ${answeredResult ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                        {answeredResult ? 'Correto! +10 pts' : 'Incorreto!'}
                      </div>
                      <button
                        onClick={() => {
                          if (questionIdx + 1 < QUIZ_QUESTIONS.length) {
                            setQuestionIdx(q => q + 1);
                            setSelectedAnswer(null);
                            setAnsweredResult(null);
                          } else {
                            alert('Parabéns! Você concluiu o Quiz!');
                            setStep('arena_hub');
                          }
                        }}
                        className="px-6 py-3 bg-amber-400 text-slate-950 font-black rounded-xl text-sm"
                      >
                        Próxima Pergunta ➔
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* VERDADEIRO OU FALSO GAME */}
              {activeGame === 'verdadeiro_falso' && (
                <div className="space-y-6">
                  <div className="inline-block bg-emerald-600/30 border border-emerald-400 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                    Verdadeiro ou Falso &bull; Afirmação {questionIdx + 1} de {VF_QUESTIONS.length}
                  </div>

                  <h3 className="text-2xl font-black text-white">
                    "{VF_QUESTIONS[questionIdx].statement}"
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Verdadeiro', val: true },
                      { label: 'Falso', val: false }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        disabled={answeredResult !== null}
                        onClick={() => {
                          const correct = item.val === VF_QUESTIONS[questionIdx].isTrue;
                          setAnsweredResult(correct);
                          if (correct) {
                            addScorePoints(10);
                            confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                          }
                        }}
                        className="p-6 rounded-2xl border-2 font-bold text-lg bg-slate-950 border-cyan-800 hover:bg-cyan-950 text-white"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {answeredResult !== null && (
                    <div className="space-y-4">
                      <div className={`p-3 rounded-2xl font-bold text-sm ${answeredResult ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                        {answeredResult ? 'Resposta Certa! +10 pts' : 'Resposta Errada!'}
                      </div>
                      <button
                        onClick={() => {
                          if (questionIdx + 1 < VF_QUESTIONS.length) {
                            setQuestionIdx(q => q + 1);
                            setAnsweredResult(null);
                          } else {
                            alert('Parabéns! Você concluiu Verdadeiro ou Falso!');
                            setStep('arena_hub');
                          }
                        }}
                        className="px-6 py-3 bg-amber-400 text-slate-950 font-black rounded-xl text-sm"
                      >
                        Próxima Afirmação ➔
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* FORCA GAME */}
              {activeGame === 'forca' && (
                <div className="space-y-6">
                  <div className="inline-block bg-amber-600/30 border border-amber-400 text-amber-300 text-xs font-bold px-3 py-1 rounded-full">
                    Jogo da Forca &bull; Dica: {FORCA_WORDS[forcaIdx].hint}
                  </div>

                  <div className="text-4xl font-mono tracking-widest text-amber-400 font-black my-4">
                    {FORCA_WORDS[forcaIdx].word.split('').map(char => guessedLetters.includes(char) ? char : '_').join(' ')}
                  </div>

                  <div className="grid grid-cols-6 gap-2 max-w-md mx-auto">
                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => {
                      const guessed = guessedLetters.includes(letter);
                      return (
                        <button
                          key={letter}
                          disabled={guessed}
                          onClick={() => {
                            const newGuessed = [...guessedLetters, letter];
                            setGuessedLetters(newGuessed);
                            const currentWord = FORCA_WORDS[forcaIdx].word;
                            const isCorrectLetter = currentWord.includes(letter);
                            if (isCorrectLetter) {
                              const wordCompleted = currentWord.split('').every((char: string) => newGuessed.includes(char));
                              if (wordCompleted) {
                                addScorePoints(15);
                                confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
                              }
                            }
                          }}
                          className={`p-3 rounded-xl border font-bold text-sm ${guessed ? 'bg-slate-900 border-slate-800 text-slate-600' : 'bg-slate-950 border-cyan-700 text-white hover:bg-cyan-900'}`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      if (forcaIdx + 1 < FORCA_WORDS.length) {
                        setForcaIdx(f => f + 1);
                        setGuessedLetters([]);
                      } else {
                        alert('Parabéns! Você concluiu a Forca!');
                        setStep('arena_hub');
                      }
                    }}
                    className="px-6 py-3 bg-amber-400 text-slate-950 font-black rounded-xl text-sm"
                  >
                    Próxima Palavra ➔
                  </button>
                </div>
              )}

              {/* STOP / ADEDONHA GAME (EM CONSTRUÇÃO) */}
              {activeGame === 'stop_adedonha' && (
                <div className="space-y-6 py-12 text-center">
                  <div className="inline-block bg-slate-700/30 border border-slate-500 text-slate-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                    Stop / Adedonha &bull; Em Construção
                  </div>
                  <h3 className="text-2xl font-black text-white">
                    🚧 Este jogo está em construção e estará disponível em breve!
                  </h3>
                  <button
                    onClick={() => setStep('arena_hub')}
                    className="px-6 py-3 bg-amber-400 text-slate-950 font-black rounded-xl text-sm"
                  >
                    ← Voltar aos Jogos
                  </button>
                </div>
              )}

            </div>
          )}
        </>
      )}

    </div>
  );
};
