import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Key, Armchair, RefreshCw, LogOut, Gamepad2, Trophy } from 'lucide-react';
import { collection, doc, getDoc, updateDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import confetti from 'canvas-confetti';
import { EstilingueDaTurma } from './EstilingueDaTurma';

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
  const [step, setStep] = useState<'list' | 'pin' | 'profile' | 'grid' | 'arena_hub' | 'play_jogo_cores' | 'play_jogo_forca' | 'play_jogo_quiz' | 'play_jogo_quadrado' | 'play_jogo_vf' | 'play_jogo_tiro_alvo' | 'play_jogo_estilingue'>('list');

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

  // Jogo da Forca state
  const [currentForcaWord, setCurrentForcaWord] = useState({ word: 'ALAGOAS', hint: 'Estado brasileiro conhecido pelas praias e lagoas.' });
  const [guessedForcaLetters, setGuessedForcaLetters] = useState<string[]>([]);
  const [forcaMistakes, setForcaMistakes] = useState(0);
  const [hintUnlocked, setHintUnlocked] = useState(false);
  const [forcaTimer, setForcaTimer] = useState(30);
  const [forcaTimerActive, setForcaTimerActive] = useState(false);
  const [forcaFeedback, setForcaFeedback] = useState<{ text: string; success: boolean } | null>(null);

  // Jogo do Quiz state
  const [lastQuizRodadaAnswered, setLastQuizRodadaAnswered] = useState<number | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{ text: string; correct: boolean } | null>(null);

  // Jogo do Quadrado state
  const [myQuadradoChoice, setMyQuadradoChoice] = useState<number | null>(null);
  const [lastQuadradoRodadaSeen, setLastQuadradoRodadaSeen] = useState<number | null>(null);

  // Jogo V/F state
  const [lastVFRodadaAnswered, setLastVFRodadaAnswered] = useState<number | null>(null);
  const [vfFeedback, setVfFeedback] = useState<{ text: string; correct: boolean } | null>(null);

  // Jogo Tiro ao Alvo state
  const [taScore, setTaScore] = useState(0);
  const [taTimeLeft, setTaTimeLeft] = useState(30); // 30 seconds
  const [taGameActive, setTaGameActive] = useState(false);
  const [taTargets, setTaTargets] = useState<any[]>([]);
  const [taGameOver, setTaGameOver] = useState(false);

  const taScoreRef = useRef(0);
  useEffect(() => {
    taScoreRef.current = taScore;
  }, [taScore]);

  useEffect(() => {
    let timer: any = null;
    let spawner: any = null;
    if (taGameActive && step === 'play_jogo_tiro_alvo') {
      timer = setInterval(() => {
        setTaTimeLeft(prev => {
          if (prev <= 1) {
            setTaGameActive(false);
            setTaGameOver(true);
            clearInterval(timer);
            clearInterval(spawner);
            if (taScoreRef.current > 0) {
              addScorePoints(taScoreRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      spawner = setInterval(() => {
        if (!taGameActive) return;
        const newTargets: any[] = [];
        for (let i = 0; i < 4; i++) {
          const id = Math.random().toString(36).substring(2, 9);
          const type = Math.random() > 0.4 ? 'vermelho' : 'azul';
          const x = Math.floor(Math.random() * 80) + 10;
          const y = Math.floor(Math.random() * 75) + 12;
          newTargets.push({ id, type, x, y });
        }
        setTaTargets(prev => [...prev.slice(-20), ...newTargets]);
      }, 350);
    }
    return () => {
      clearInterval(timer);
      clearInterval(spawner);
    };
  }, [taGameActive, step]);

  const startTiroAlvoGame = () => {
    setTaScore(0);
    setTaTimeLeft(30); // 30 seconds
    setTaGameActive(true);
    setTaGameOver(false);
    setTaTargets([]);
    setStep('play_jogo_tiro_alvo');
  };

  useEffect(() => {
    if (selectedSala?.vfRodadaId) {
      setLastVFRodadaAnswered(null);
      setVfFeedback(null);
    }
  }, [selectedSala?.vfRodadaId]);

  const handleAnswerVF = (chosenIsTrue: boolean) => {
    const currentVFRodada = selectedSala?.vfRodadaId || 0;
    if (lastVFRodadaAnswered === currentVFRodada || vfFeedback) return;

    setLastVFRodadaAnswered(currentVFRodada);
    const correctIsTrue = selectedSala?.afirmacaoAtivaVF?.isTrue === true;
    const isCorrect = chosenIsTrue === correctIsTrue;

    if (isCorrect) {
      addScorePoints(10);
      setVfFeedback({ text: `🎉 Resposta Correta! +10 pts`, correct: true });
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } else {
      addScorePoints(-3);
      setVfFeedback({ text: `❌ Resposta Errada! -3 pts`, correct: false });
    }
  };

  useEffect(() => {
    if (selectedSala?.palavraAtivaForca) {
      setCurrentForcaWord({
        word: String(selectedSala.palavraAtivaForca).toUpperCase().trim(),
        hint: String(selectedSala.dicaAtivaForca || 'Sem dica cadastrada.')
      });
      setGuessedForcaLetters([]);
      setForcaMistakes(0);
      setHintUnlocked(false);
      setForcaTimer(30);
      setForcaTimerActive(false);
      setForcaFeedback(null);
    }
  }, [selectedSala?.palavraAtivaForca, selectedSala?.forcaRodadaId]);

  useEffect(() => {
    if (selectedSala?.quizRodadaId) {
      setLastQuizRodadaAnswered(null);
      setQuizFeedback(null);
    }
  }, [selectedSala?.quizRodadaId]);

  useEffect(() => {
    if (selectedSala?.quadradoRodadaId) {
      if (lastQuadradoRodadaSeen !== selectedSala.quadradoRodadaId) {
        setLastQuadradoRodadaSeen(selectedSala.quadradoRodadaId);
        setMyQuadradoChoice(null);
      }
    }
  }, [selectedSala?.quadradoRodadaId]);

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

  // Forca Timer effect
  useEffect(() => {
    let interval: any = null;
    if (forcaTimerActive && forcaTimer > 0 && step === 'play_jogo_forca') {
      interval = setInterval(() => {
        setForcaTimer(prev => {
          if (prev <= 1) {
            setForcaTimerActive(false);
            setForcaFeedback({ text: `⏰ Tempo esgotado (30s)! A palavra era: ${currentForcaWord.word}`, success: false });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [forcaTimerActive, forcaTimer, currentForcaWord, step]);

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

  const handleStartGrid = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nome.trim();
    if (!cleanName) {
      alert('Digite seu nome.');
      return;
    }

    if (!selectedSala || !db) {
      setStep('grid');
      return;
    }

    try {
      const salaRef = doc(db, 'salas', selectedSala.id);
      const docSnap = await getDoc(salaRef);
      if (docSnap.exists()) {
        const salaData = docSnap.data();
        const expelledNames = (salaData.expelledNames || []).map((n: string) => n.toUpperCase().trim());
        if (expelledNames.includes(cleanName.toUpperCase().trim())) {
          alert('Você foi expulso desta sala pelo professor e não pode retornar.');
          return;
        }

        const existingChair = (salaData.cadeiras || []).find(
          (c: any) => c.ocupada && c.nomeAluno && c.nomeAluno.toUpperCase().trim() === cleanName.toUpperCase()
        );

        if (existingChair) {
          sessionStorage.setItem('arena_my_sala', selectedSala.id);
          sessionStorage.setItem('arena_my_chair', String(existingChair.id));
          setMySalaId(selectedSala.id);
          setMyChairId(existingChair.id);
          setScore(existingChair.score || 0);
          setAvatar(existingChair.avatar || avatar);
          setStep('arena_hub');
          return;
        }
      }
    } catch (err) {
      console.error("Erro ao verificar reconexão:", err);
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
    let updatedNewScore = 0;
    setScore(prev => {
      updatedNewScore = prev + points;
      return updatedNewScore;
    });

    if (!mySalaId || !myChairId || !db) return;
    try {
      await runTransaction(db as any, async (transaction: any) => {
        const salaRef = doc(db as any, 'salas', mySalaId);
        const salaDoc = await transaction.get(salaRef);
        if (!salaDoc.exists()) return;
        const salaData = salaDoc.data();
        const updatedCadeiras = (salaData.cadeiras || []).map((c: any) => {
          if (c.id === myChairId) {
            const currentScore = typeof c.score === 'number' ? c.score : 0;
            const finalScore = Math.max(0, currentScore + points);
            updatedNewScore = finalScore;
            return { ...c, score: finalScore };
          }
          return c;
        });
        transaction.update(salaRef, { cadeiras: updatedCadeiras });
      });
      setScore(updatedNewScore);
    } catch (err) {
      console.error("Erro ao atualizar placar em transação:", err);
    }
  };

  const handleStartForca = () => {
    if (selectedSala?.palavraAtivaForca) {
      setCurrentForcaWord({
        word: String(selectedSala.palavraAtivaForca).toUpperCase().trim(),
        hint: String(selectedSala.dicaAtivaForca || 'Sem dica cadastrada.')
      });
    }
    setGuessedForcaLetters([]);
    setForcaMistakes(0);
    setHintUnlocked(false);
    setForcaTimer(30);
    setForcaTimerActive(false);
    setForcaFeedback(null);
    setStep('play_jogo_forca');
  };

  const handleNextForcaWord = () => {
    setGuessedForcaLetters([]);
    setForcaMistakes(0);
    setHintUnlocked(false);
    setForcaTimer(30);
    setForcaTimerActive(false);
    setForcaFeedback(null);
  };

  const handleGuessForcaLetter = (letter: string) => {
    if (guessedForcaLetters.includes(letter) || forcaFeedback) return;

    const newGuessed = [...guessedForcaLetters, letter];
    setGuessedForcaLetters(newGuessed);

    const isCorrect = currentForcaWord.word.includes(letter);
    const newMistakes = forcaMistakes + (isCorrect ? 0 : 1);
    if (!isCorrect) {
      setForcaMistakes(newMistakes);
    }

    // A dica abre após 3 letras. Quando colocar as 3 letras abre o tempo pra finalizar.
    if (newGuessed.length === 3 && !hintUnlocked) {
      setHintUnlocked(true);
      setForcaTimer(30);
      setForcaTimerActive(true);
    }

    // Check if word is fully solved
    const wordLetters = Array.from(new Set(currentForcaWord.word.replace(/\s+/g, '')));
    const solved = wordLetters.every(l => newGuessed.includes(l));

    if (solved) {
      setForcaTimerActive(false);
      addScorePoints(15);
      setForcaFeedback({ text: `🎉 Acertou a palavra "${currentForcaWord.word}"! +15 pts`, success: true });
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } else if (newMistakes >= 6) {
      setForcaTimerActive(false);
      setForcaFeedback({ text: `❌ Game Over! A palavra era: ${currentForcaWord.word}`, success: false });
    }
  };

  const handleAnswerQuiz = (optionIdx: number) => {
    const currentQuizRodada = selectedSala?.quizRodadaId || 0;
    if (lastQuizRodadaAnswered === currentQuizRodada || quizFeedback) return;

    setLastQuizRodadaAnswered(currentQuizRodada);
    const correctIdx = selectedSala?.perguntaAtivaQuiz?.correctIndex ?? 0;
    const isCorrect = optionIdx === correctIdx;

    if (isCorrect) {
      addScorePoints(10);
      setQuizFeedback({ text: `🎉 Resposta Correta! +10 pts`, correct: true });
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } else {
      addScorePoints(-3);
      setQuizFeedback({ text: `❌ Resposta Errada! -3 pts`, correct: false });
    }
  };

  const handleChooseQuadrado = async (sqIdx: number) => {
    if (!mySalaId || !myChairId || !db) return;
    try {
      await updateDoc(doc(db as any, 'salas', mySalaId), {
        [`escolhasAlunosQuadrado.${myChairId}`]: sqIdx
      });
      setMyQuadradoChoice(sqIdx);
    } catch (err) {
      console.error("Erro ao escolher quadrado:", err);
    }
  };

  const currentRodadaId = selectedSala?.rodadaId || 0;
  const hasAnsweredCurrentRodada = lastRodadaAnswered === currentRodadaId;
  const corEscolhidaProfessor = selectedSala?.corRodada ? selectedSala.corRodada.toUpperCase() : '...';

  const myChairData = (selectedSala?.cadeiras || []).find((c: any) => c.id === myChairId);
  const isEliminatedInQuadrado = myChairData?.eliminadoQuadrado === true;

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
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-white">Seu Perfil de Aluno</h3>
                <p className="text-sm text-cyan-300/70">Digite seu nome exato para entrar ou retomar sua cadeira e pontuação caso tenha saído</p>
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

          {/* STEP 5: ARENA HUB (JOGO DAS CORES, FORCA, QUIZ & QUADRADO) */}
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
                  <span>Jogos Disponíveis na Arena:</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Jogo das Cores Card */}
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
                        className={`border p-5 rounded-3xl transition flex flex-col justify-between ${isUnlocked ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-white/30 cursor-pointer shadow-xl transform hover:scale-102' : 'bg-slate-950/90 border-red-900/60 opacity-80 cursor-not-allowed'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-black text-white mb-1">🎨 CORES</h4>
                            <p className="text-[11px] text-white/90">Evite a cor do professor!</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                            {isUnlocked ? '🔓' : '🔒'}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-black text-white">
                          <span>{isUnlocked ? 'Jogar ➔' : 'Trancado'}</span>
                          <span className="text-amber-200">{score} pts</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Jogo da Forca Card */}
                  {(() => {
                    const isForcaUnlocked = selectedSala.jogoForcaLiberado === true;

                    return (
                      <div
                        onClick={() => {
                          if (!isForcaUnlocked) {
                            alert('O Jogo da Forca está trancado pelo professor no momento.');
                            return;
                          }
                          handleStartForca();
                        }}
                        className={`border p-5 rounded-3xl transition flex flex-col justify-between ${isForcaUnlocked ? 'bg-gradient-to-br from-amber-600 to-yellow-600 border-white/30 cursor-pointer shadow-xl transform hover:scale-102' : 'bg-slate-950/90 border-red-900/60 opacity-80 cursor-not-allowed'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-black text-white mb-1">🔤 FORCA</h4>
                            <p className="text-[11px] text-white/90">Descubra palavras! +15 pts.</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isForcaUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                            {isForcaUnlocked ? '🔓' : '🔒'}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-black text-white">
                          <span>{isForcaUnlocked ? 'Jogar ➔' : 'Trancado'}</span>
                          <span className="text-amber-200">{score} pts</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Jogo do Quiz Card */}
                  {(() => {
                    const isQuizUnlocked = selectedSala.jogoQuizLiberado === true;

                    return (
                      <div
                        onClick={() => {
                          if (!isQuizUnlocked) {
                            alert('O Jogo do Quiz está trancado pelo professor no momento.');
                            return;
                          }
                          setStep('play_jogo_quiz');
                          setQuizFeedback(null);
                        }}
                        className={`border p-5 rounded-3xl transition flex flex-col justify-between ${isQuizUnlocked ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-white/30 cursor-pointer shadow-xl transform hover:scale-102' : 'bg-slate-950/90 border-red-900/60 opacity-80 cursor-not-allowed'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-black text-white mb-1">❓ QUIZ</h4>
                            <p className="text-[11px] text-white/90">+10 pts acerto, -3 pts erro.</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isQuizUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                            {isQuizUnlocked ? '🔓' : '🔒'}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-black text-white">
                          <span>{isQuizUnlocked ? 'Jogar ➔' : 'Trancado'}</span>
                          <span className="text-amber-200">{score} pts</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Jogo do Quadrado Card */}
                  {(() => {
                    const isQuadradoUnlocked = selectedSala.jogoQuadradoLiberado === true;

                    return (
                      <div
                        onClick={() => {
                          if (!isQuadradoUnlocked) {
                            alert('O Jogo do Quadrado está trancado pelo professor no momento.');
                            return;
                          }
                          setStep('play_jogo_quadrado');
                        }}
                        className={`border p-5 rounded-3xl transition flex flex-col justify-between ${isQuadradoUnlocked ? 'bg-gradient-to-br from-emerald-600 to-teal-600 border-white/30 cursor-pointer shadow-xl transform hover:scale-102' : 'bg-slate-950/90 border-red-900/60 opacity-80 cursor-not-allowed'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-black text-white mb-1">🟩 QUADRADO</h4>
                            <p className="text-[11px] text-white/90">Evite o quadrado do prof! +20 pts.</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isQuadradoUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                            {isQuadradoUnlocked ? '🔓' : '🔒'}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-black text-white">
                          <span>{isQuadradoUnlocked ? 'Jogar ➔' : 'Trancado'}</span>
                          <span className="text-amber-200">{score} pts</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Jogo Tiro ao Alvo Card */}
                  {(() => {
                    const isTAUnlocked = selectedSala.jogoTiroAlvoLiberado === true;

                    return (
                      <div
                        onClick={() => {
                          if (!isTAUnlocked) {
                            alert('O Jogo Tiro ao Alvo está trancado pelo professor no momento.');
                            return;
                          }
                          startTiroAlvoGame();
                        }}
                        className={`border p-5 rounded-3xl transition flex flex-col justify-between ${isTAUnlocked ? 'bg-gradient-to-br from-cyan-600 to-blue-700 border-white/30 cursor-pointer shadow-xl transform hover:scale-102' : 'bg-slate-950/90 border-red-900/60 opacity-80 cursor-not-allowed'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-black text-white mb-1">🎯 TIRO AO ALVO</h4>
                            <p className="text-[11px] text-white/90">2 min de jogo! Cada aluno pontua.</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isTAUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                            {isTAUnlocked ? '🔓' : '🔒'}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-black text-white">
                          <span>{isTAUnlocked ? 'Jogar ➔' : 'Trancado'}</span>
                          <span className="text-amber-200">{score} pts</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Jogo Estilingue da Turma Card */}
                  {(() => {
                    const isEstilingueUnlocked = selectedSala.jogoEstilingueLiberado === true;

                    return (
                      <div
                        onClick={() => {
                          if (!isEstilingueUnlocked) {
                            alert('O Estilingue da Turma está trancado pelo professor no momento.');
                            return;
                          }
                          setStep('play_jogo_estilingue');
                        }}
                        className={`border p-5 rounded-3xl transition flex flex-col justify-between ${isEstilingueUnlocked ? 'bg-gradient-to-br from-emerald-700 to-teal-800 border-white/30 cursor-pointer shadow-xl transform hover:scale-102' : 'bg-slate-950/90 border-red-900/60 opacity-80 cursor-not-allowed'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-black text-white mb-1">🐦 ESTILINGUE</h4>
                            <p className="text-[11px] text-white/90">+2 pts obj, +5 pts pedra!</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isEstilingueUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                            {isEstilingueUnlocked ? '🔓' : '🔒'}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-black text-white">
                          <span>{isEstilingueUnlocked ? 'Jogar ➔' : 'Trancado'}</span>
                          <span className="text-amber-200">{score} pts</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Jogo V/F Card */}
                  {(() => {
                    const isVFUnlocked = selectedSala.jogoVFLiberado === true;

                    return (
                      <div
                        onClick={() => {
                          if (!isVFUnlocked) {
                            alert('O Jogo V/F está trancado pelo professor no momento.');
                            return;
                          }
                          setStep('play_jogo_vf');
                          setVfFeedback(null);
                        }}
                        className={`border p-5 rounded-3xl transition flex flex-col justify-between ${isVFUnlocked ? 'bg-gradient-to-br from-teal-600 to-cyan-600 border-white/30 cursor-pointer shadow-xl transform hover:scale-102' : 'bg-slate-950/90 border-red-900/60 opacity-80 cursor-not-allowed'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-black text-white mb-1">✅ V / F</h4>
                            <p className="text-[11px] text-white/90">+10 pts acerto, -3 pts erro.</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isVFUnlocked ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}>
                            {isVFUnlocked ? '🔓' : '🔒'}
                          </span>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-black text-white">
                          <span>{isVFUnlocked ? 'Jogar ➔' : 'Trancado'}</span>
                          <span className="text-amber-200">{score} pts</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Placar e Ranking em Tempo Real */}
              <div className="mt-8 pt-6 border-t border-cyan-900/60 space-y-4">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h4 className="text-lg font-black text-white">Placar e Ranking da Sala (Tempo Real)</h4>
                </div>

                <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-cyan-900/60 text-[11px] font-black uppercase text-cyan-300">
                        <th className="py-2 px-3">Posição</th>
                        <th className="py-2 px-3">Aluno</th>
                        <th className="py-2 px-3">Cadeira</th>
                        <th className="py-2 px-3 text-right">Pontuação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-900/40 text-xs font-semibold">
                      {[...(selectedSala.cadeiras || [])]
                        .filter((c: any) => c.ocupada && c.nomeAluno)
                        .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                        .map((c: any, index: number) => {
                          const medalColors = index === 0 ? 'bg-amber-400 text-slate-950 font-black' : index === 1 ? 'bg-slate-300 text-slate-950 font-black' : index === 2 ? 'bg-amber-700 text-white font-black' : 'bg-slate-900 text-cyan-300';
                          const isMe = c.id === myChairId;
                          return (
                            <tr key={c.id} className={`hover:bg-cyan-950/40 transition ${isMe ? 'bg-amber-500/10 font-bold' : ''}`}>
                              <td className="py-3 px-3">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${medalColors}`}>
                                  {index + 1}º
                                </span>
                              </td>
                              <td className="py-3 px-3 flex items-center space-x-2">
                                <span className="text-base">{c.avatar || '🦁'}</span>
                                <span className="text-white">{c.nomeAluno} {isMe && <span className="text-amber-400 font-bold">(Você)</span>}</span>
                              </td>
                              <td className="py-3 px-3 text-cyan-300 font-mono">
                                Cadeira #{c.id}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-amber-400 text-sm">
                                {c.score || 0} pts
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* STEP 6: PLAY JOGO DAS CORES */}
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

          {/* STEP 7: PLAY JOGO DA FORCA */}
          {step === 'play_jogo_forca' && selectedSala && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 max-w-2xl mx-auto w-full text-center">
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('arena_hub')}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs"
                >
                  ← Voltar
                </button>
                <div className="bg-amber-400/20 border border-amber-400/40 px-4 py-1.5 rounded-xl">
                  <span className="text-xs text-cyan-200 font-bold mr-2">Pontuação:</span>
                  <span className="text-lg font-black text-amber-400">{score} pts</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="inline-block bg-amber-600/30 border border-amber-400 text-amber-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                  🔤 JOGO DA FORCA &bull; +15 PTS POR PALAVRA
                </div>

                {!selectedSala?.palavraAtivaForca ? (
                  <div className="text-sm text-cyan-300/80 bg-slate-950 p-8 rounded-2xl border border-cyan-900 space-y-2">
                    <p className="font-bold">Aguardando o professor escolher e liberar a palavra no painel...</p>
                    <p className="text-xs text-cyan-400/60">Assim que o professor liberar a palavra, ela aparecerá aqui para você!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Timer & Mistakes banner */}
                    <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-cyan-900 text-xs font-bold">
                      <span className="text-red-400">Erros: {forcaMistakes} / 6</span>
                      {hintUnlocked && (
                        <span className="text-amber-400 animate-pulse font-mono text-sm">
                          ⏱️ Tempo: {forcaTimer}s
                        </span>
                      )}
                      <span className="text-cyan-300">Letras Tentadas: {guessedForcaLetters.length}</span>
                    </div>

                    {/* Word display */}
                    <div className="bg-slate-950 p-8 rounded-3xl border-2 border-amber-500/40 shadow-xl space-y-6">
                      <div className="flex flex-wrap justify-center gap-3">
                        {currentForcaWord.word.split('').map((char, idx) => {
                          const isSpace = char === ' ' || char === '-';
                          const revealed = isSpace || guessedForcaLetters.includes(char) || forcaFeedback !== null;
                          return (
                            <div
                              key={`forca-char-${idx}-${char}`}
                              translate="no"
                              className={`w-10 h-12 md:w-12 md:h-14 rounded-xl flex items-center justify-center text-xl md:text-2xl font-black shadow-inner ${isSpace ? 'bg-transparent border-0 text-transparent' : 'bg-[#07262c] border-2 border-amber-400 text-amber-300'}`}
                            >
                              {isSpace ? ' ' : (revealed ? char : '_')}
                            </div>
                          );
                        })}
                      </div>

                      {/* Hint Section */}
                      <div className="pt-4 border-t border-cyan-900/60">
                        {hintUnlocked ? (
                          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-xs text-amber-200 font-bold space-y-1">
                            <span className="uppercase tracking-wider text-amber-400 block font-black">💡 Dica da Palavra:</span>
                            <p>{currentForcaWord.hint}</p>
                          </div>
                        ) : (
                          <div className="bg-slate-900/60 p-3 rounded-2xl text-xs text-cyan-400/70 font-bold">
                            🔒 A Dica abrirá após você tentar/colocar 3 letras (Tentadas: {guessedForcaLetters.length}/3)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feedback */}
                    {forcaFeedback && (
                      <div className={`p-4 rounded-2xl font-black text-sm animate-bounce ${forcaFeedback.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                        {forcaFeedback.text}
                      </div>
                    )}

                    {/* Alphabet Virtual Keyboard */}
                    <div className="grid grid-cols-7 sm:grid-cols-9 gap-2">
                      {['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map(letter => {
                        const tried = guessedForcaLetters.includes(letter);
                        return (
                          <button
                            key={`kbd-${letter}`}
                            translate="no"
                            disabled={tried || forcaFeedback !== null}
                            onClick={() => handleGuessForcaLetter(letter)}
                            className={`py-3 rounded-xl font-black text-xs md:text-sm transition shadow ${tried ? 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed' : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-200 transform hover:scale-105'}`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* STEP 8: PLAY JOGO DO QUIZ */}
          {step === 'play_jogo_quiz' && selectedSala && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 max-w-2xl mx-auto w-full text-center">
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('arena_hub')}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs"
                >
                  ← Voltar
                </button>
                <div className="bg-amber-400/20 border border-amber-400/40 px-4 py-1.5 rounded-xl">
                  <span className="text-xs text-cyan-200 font-bold mr-2">Pontuação:</span>
                  <span className="text-lg font-black text-amber-400">{score} pts</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="inline-block bg-blue-600/30 border border-blue-400 text-blue-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                  ❓ QUIZ DO DIA &bull; ACERTO: +10 PTS | ERRO: -3 PTS
                </div>

                {!selectedSala?.perguntaAtivaQuiz ? (
                  <div className="text-sm text-cyan-300/80 bg-slate-950 p-8 rounded-2xl border border-cyan-900 space-y-2">
                    <p className="font-bold">Aguardando o professor escolher e liberar a pergunta no painel...</p>
                    <p className="text-xs text-cyan-400/60">Assim que o professor liberar a pergunta, ela aparecerá aqui para você!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-slate-950 p-6 rounded-3xl border-2 border-blue-500/40 shadow-xl space-y-4">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">Tema: {selectedSala.perguntaAtivaQuiz.tema || 'GERAL'}</span>
                      <h4 className="text-lg md:text-xl font-black text-white">
                        {selectedSala.perguntaAtivaQuiz.question}
                      </h4>

                      {lastQuizRodadaAnswered === selectedSala.quizRodadaId && (
                        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 font-bold text-xs">
                          🔒 Resposta registrada! A 2ª resposta está travada. Aguarde o professor liberar a próxima pergunta.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {(selectedSala.perguntaAtivaQuiz.options || []).map((opt: string, idx: number) => {
                        const letterLabel = ['A', 'B', 'C', 'D'][idx] || String(idx + 1);
                        const isAnswered = lastQuizRodadaAnswered === selectedSala.quizRodadaId;

                        return (
                          <button
                            key={`quiz-opt-${idx}`}
                            disabled={isAnswered}
                            onClick={() => handleAnswerQuiz(idx)}
                            className={`p-4 rounded-2xl border-2 font-black text-sm text-left transition flex items-start space-x-3 shadow-lg ${isAnswered ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-950 hover:bg-blue-950/40 border-blue-500/40 text-white hover:border-blue-400'}`}
                          >
                            <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                              {letterLabel}
                            </span>
                            <span className="whitespace-normal break-words text-xs md:text-sm font-semibold flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {quizFeedback && (
                      <div className={`p-4 rounded-2xl font-black text-sm animate-bounce ${quizFeedback.correct ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                        {quizFeedback.text}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* STEP 9: PLAY JOGO DO QUADRADO */}
          {step === 'play_jogo_quadrado' && selectedSala && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 max-w-2xl mx-auto w-full text-center">
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('arena_hub')}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs"
                >
                  ← Voltar
                </button>
                <div className="bg-amber-400/20 border border-amber-400/40 px-4 py-1.5 rounded-xl">
                  <span className="text-xs text-cyan-200 font-bold mr-2">Pontuação:</span>
                  <span className="text-lg font-black text-amber-400">{score} pts</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="inline-block bg-emerald-600/30 border border-emerald-400 text-emerald-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                  🟩 JOGO DO QUADRADO &bull; EVITE O QUADRADO DO PROFESSOR (+20 PTS)
                </div>

                {isEliminatedInQuadrado ? (
                  <div className="p-8 bg-red-950/90 border-2 border-red-500 rounded-3xl space-y-4 shadow-2xl">
                    <span className="text-3xl block">❌</span>
                    <h3 className="text-xl font-black text-red-300 uppercase">Você foi eliminado do Jogo do Quadrado!</h3>
                    <p className="text-xs text-red-200/80">Você escolheu o quadrado secreto do professor ou sua pontuação zerou.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-slate-950 p-6 rounded-3xl border-2 border-emerald-500/40 shadow-xl space-y-3">
                      <h4 className="text-lg font-black text-white">Escolha seu Quadrado Secreto</h4>
                      <p className="text-xs text-emerald-200/80">
                        Se escolher o quadrado do professor, você é eliminado. Se escolher igual a outro aluno, perde -5 pts. Se escolher sozinho e seguro, ganha +20 pts!
                      </p>
                      {myQuadradoChoice !== null && (
                        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 font-bold text-xs">
                          🔒 Você escolheu o <strong>Quadrado #{myQuadradoChoice + 1}</strong>. Aguarde o professor revelar o resultado!
                        </div>
                      )}
                    </div>

                    {(() => {
                      const activeNonEliminated = (selectedSala.cadeiras || []).filter((c: any) => c.ocupada && !c.eliminadoQuadrado).length;
                      const gridSize = Math.max(2, activeNonEliminated + (activeNonEliminated === 1 ? 1 : 2));

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {Array.from({ length: gridSize }).map((_, idx) => {
                            const isChosen = myQuadradoChoice === idx;
                            return (
                              <button
                                key={`sq-${idx}`}
                                onClick={() => handleChooseQuadrado(idx)}
                                className={`p-6 rounded-2xl border-4 font-black text-xl transition transform shadow-xl ${isChosen ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/50 scale-105' : 'bg-slate-950 hover:bg-emerald-950 border-emerald-500/50 text-emerald-300 hover:scale-102'}`}
                              >
                                {isChosen ? `✓ Q #${idx + 1}` : `Quadrado #${idx + 1}`}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* STEP 11: PLAY JOGO V/F */}
          {step === 'play_jogo_vf' && selectedSala && (
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6 max-w-2xl mx-auto w-full text-center">
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('arena_hub')}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs"
                >
                  ← Voltar
                </button>
                <div className="bg-amber-400/20 border border-amber-400/40 px-4 py-1.5 rounded-xl">
                  <span className="text-xs text-cyan-200 font-bold mr-2">Pontuação:</span>
                  <span className="text-lg font-black text-amber-400">{score} pts</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="inline-block bg-teal-600/30 border border-teal-400 text-teal-300 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                  ✅ VERDADEIRO OU FALSO &bull; ACERTO: +10 PTS | ERRO: -3 PTS
                </div>

                {!selectedSala?.afirmacaoAtivaVF ? (
                  <div className="text-sm text-cyan-300/80 bg-slate-950 p-8 rounded-2xl border border-cyan-900 space-y-2">
                    <p className="font-bold">Aguardando o professor escolher e liberar a afirmação V/F no painel...</p>
                    <p className="text-xs text-cyan-400/60">Assim que o professor liberar a afirmação, ela aparecerá aqui para você!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-slate-950 p-6 rounded-3xl border-2 border-teal-500/40 shadow-xl space-y-4">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">Tema: {selectedSala.afirmacaoAtivaVF.tema || 'GERAL'}</span>
                      <h4 className="text-lg md:text-xl font-black text-white">
                        {selectedSala.afirmacaoAtivaVF.statement}
                      </h4>

                      {lastVFRodadaAnswered === selectedSala.vfRodadaId && (
                        <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 font-bold text-xs">
                          🔒 Resposta registrada! Aguarde o professor liberar a próxima afirmação.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        disabled={lastVFRodadaAnswered === selectedSala.vfRodadaId}
                        onClick={() => handleAnswerVF(true)}
                        className={`p-6 rounded-2xl border-2 font-black text-base transition shadow-xl ${lastVFRodadaAnswered === selectedSala.vfRodadaId ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white transform hover:scale-105'}`}
                      >
                        ✓ VERDADEIRO
                      </button>

                      <button
                        disabled={lastVFRodadaAnswered === selectedSala.vfRodadaId}
                        onClick={() => handleAnswerVF(false)}
                        className={`p-6 rounded-2xl border-2 font-black text-base transition shadow-xl ${lastVFRodadaAnswered === selectedSala.vfRodadaId ? 'opacity-50 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-500' : 'bg-red-600 hover:bg-red-500 border-red-400 text-white transform hover:scale-105'}`}
                      >
                        ✕ FALSO
                      </button>
                    </div>

                    {vfFeedback && (
                      <div className={`p-4 rounded-2xl font-black text-sm animate-bounce ${vfFeedback.correct ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'}`}>
                        {vfFeedback.text}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* STEP 12: PLAY JOGO TIRO AO ALVO */}
          {step === 'play_jogo_tiro_alvo' && selectedSala && (
            <div className="bg-[#050a14] border-2 border-cyan-400 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 max-w-4xl mx-auto w-full text-center relative overflow-hidden font-mono">
              
              <div className="flex items-center justify-between z-20 relative">
                <button
                  onClick={() => {
                    setTaGameActive(false);
                    setStep('arena_hub');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs cursor-pointer"
                >
                  ← Voltar
                </button>
                <div className="flex items-center space-x-4">
                  <div className="bg-cyan-950/80 border border-cyan-400 px-4 py-1.5 rounded-xl text-cyan-300 font-bold text-sm">
                    PONTOS: <span className="text-amber-400 font-black">{taScore}</span>
                  </div>
                  <div className="bg-cyan-950/80 border border-cyan-400 px-4 py-1.5 rounded-xl text-cyan-300 font-bold text-sm">
                    TEMPO: <span className="text-red-400 font-black">{taTimeLeft}s</span> (30s)
                  </div>
                </div>
              </div>

              {!taGameActive && !taGameOver && (
                <div className="py-16 space-y-6 z-20 relative">
                  <h3 className="text-3xl font-black text-cyan-400 tracking-wider">🎯 TIRO AO ALVO &bull; 30 SEGUNDOS</h3>
                  <p className="text-sm text-cyan-200 max-w-md mx-auto">
                    Clique nos alvos que aparecem na tela o mais rápido possível!<br/>
                    🔵 <strong>Azul</strong> = <span className="text-cyan-300 font-bold">1 ponto</span><br/>
                    🔴 <strong>Vermelho</strong> = <span className="text-red-400 font-bold">3 pontos</span>
                  </p>
                  <button
                    onClick={() => setTaGameActive(true)}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-lg uppercase shadow-2xl tracking-widest cursor-pointer hover:scale-105 transition"
                  >
                    COMEÇAR JOGO 🚀
                  </button>
                </div>
              )}

              {taGameOver && (
                <div className="py-16 space-y-6 z-20 relative">
                  <h3 className="text-3xl font-black text-red-500 tracking-wider">FIM DE JOGO!</h3>
                  <p className="text-xl font-black text-amber-400">
                    Pontuação Final Obtida: {taScore} pts (Adicionada ao seu placar da sala!)
                  </p>
                  <p className="text-xs text-cyan-300">
                    O jogo foi encerrado. Para jogar novamente, aguarde o professor liberar o jogo no painel.
                  </p>
                  <button
                    onClick={() => setStep('arena_hub')}
                    className="px-8 py-4 rounded-2xl bg-cyan-400 text-slate-950 font-black text-base uppercase shadow-xl cursor-pointer hover:bg-cyan-300 transition"
                  >
                    Voltar para a Arena ➔
                  </button>
                </div>
              )}

              {taGameActive && (
                <div className="relative w-full h-[60vh] border border-cyan-500/40 bg-radial from-slate-900 to-slate-950 rounded-2xl overflow-hidden cursor-crosshair">
                  {taTargets.map(t => (
                    <div
                      key={t.id}
                      onClick={() => {
                        const pts = t.type === 'vermelho' ? 3 : 1;
                        setTaScore(prev => prev + pts);
                        setTaTargets(prev => prev.filter(target => target.id !== t.id));
                      }}
                      style={{ left: `${t.x}%`, top: `${t.y}%` }}
                      className={`absolute cursor-pointer flex items-center justify-center rounded-full transform -translate-x-1/2 -translate-y-1/2 transition ${t.type === 'vermelho' ? 'w-16 h-16 border-4 border-red-500 bg-red-500/30 shadow-[0_0_20px_#ef4444]' : 'w-14 h-14 border-4 border-blue-500 bg-blue-500/30 shadow-[0_0_20px_#3b82f6]'}`}
                    >
                      <span className="text-[10px] font-black text-white">{t.type === 'vermelho' ? '3P' : '1P'}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* STEP 13: PLAY ESTILINGUE DA TURMA */}
          {step === 'play_jogo_estilingue' && selectedSala && (
            <EstilingueDaTurma
              onBack={() => setStep('arena_hub')}
              onAddScore={(pts) => addScorePoints(pts)}
              maxUnlockedPhase={selectedSala.estilingueMaxPhase || 0}
            />
          )}
        </>
      )}

    </div>
  );
};
