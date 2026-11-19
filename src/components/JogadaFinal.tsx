import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trophy, Clock, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface JogadaFinalProps {
  onBack: () => void;
  onAddScore: (points: number) => void;
  onCompleteGame: (totalTimeMs: number, calculatedPoints: number) => void;
  roomPlayers?: { id: number; name: string; timeMs?: number }[];
}

const SHUFFLE = (arr: any[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const FORMAT_TIME = (ms: number) => (ms / 1000).toFixed(2) + ' s';

export const JogadaFinal: React.FC<JogadaFinalProps> = ({
  onBack,
  onAddScore,
  onCompleteGame
}) => {
  const [phase, setPhase] = useState<'intro' | 'playing' | 'challenge_done' | 'final'>('intro');
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [challengeTimes, setChallengeTimes] = useState<number[]>([]);
  const [totalTime, setTotalTime] = useState(0);

  const startTimeRef = useRef(0);
  const timerRef = useRef<any>(null);

  const challenges = [
    { n: 'Memória Relâmpago', d: 'Vire as cartas e encontre os 6 pares o mais rápido que puder.' },
    { n: 'Labirinto', d: 'Pegue a chave 🔑 no canto inferior esquerdo e chegue à saída 🚪 no canto superior direito.' },
    { n: 'Caça ao Alvo', d: 'Toque nos 10 alvos conforme eles aparecem.' },
    { n: 'Siga a Sequência', d: 'Repita a sequência de cores (6 rodadas). Se errar, recomeça.' },
    { n: 'Ordem Maluca (Dobro)', d: 'Toque em dois números para trocá-los e deixe tudo em ordem de 1 a 12.' }
  ];

  const startRun = () => {
    setCurrentChallengeIndex(0);
    setChallengeTimes([]);
    setPhase('playing');
    startTimeRef.current = performance.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedMs(performance.now() - startTimeRef.current);
    }, 50);
  };

  const handleChallengeComplete = () => {
    const t = performance.now() - startTimeRef.current;
    const newTimes = [...challengeTimes, t];
    setChallengeTimes(newTimes);

    if (currentChallengeIndex < 4) {
      setCurrentChallengeIndex(prev => prev + 1);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      const sumTotal = newTimes.reduce((a, b) => a + b, 0);
      setTotalTime(sumTotal);
      setPhase('final');
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });

      // Award baseline 100 points or call completion
      const pts = 100;
      onAddScore(pts);
      onCompleteGame(sumTotal, pts);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="bg-[#150f33] border-2 border-purple-500/40 rounded-3xl p-6 md:p-8 max-w-xl mx-auto w-full text-center space-y-6 shadow-2xl font-sans text-white">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-purple-500/30 text-purple-300 font-bold text-xs flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar à Arena</span>
        </button>

        {phase === 'playing' && (
          <div className="bg-purple-950 px-4 py-1.5 rounded-xl border border-purple-800 text-amber-400 font-mono font-black text-lg">
            ⏱️ {FORMAT_TIME(elapsedMs)}
          </div>
        )}
      </div>

      {phase === 'intro' && (
        <div className="space-y-6 py-4">
          <h1 className="text-3xl font-black text-amber-400">⚡ JOGADA FINAL (Arena contra o relógio)</h1>
          <p className="text-sm text-purple-200/90 leading-relaxed">
            Cinco desafios em sequência contra o relógio! O menor tempo garante a melhor pontuação (de 100 pontos para o primeiro até 10 pontos para o último).
          </p>
          <button
            onClick={startRun}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg uppercase shadow-xl transition transform hover:scale-102"
          >
            Começar Desafios 🚀
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-purple-300 bg-purple-950/80 p-3 rounded-2xl border border-purple-800">
            <span>Desafio {currentChallengeIndex + 1} de 5</span>
            <span className="text-amber-400 font-black">{challenges[currentChallengeIndex].n}</span>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-2xl border border-purple-500/30 text-left">
            <p className="text-xs text-purple-200 mb-4">{challenges[currentChallengeIndex].d}</p>
            
            {currentChallengeIndex === 0 && <MemoriaGame onDone={handleChallengeComplete} />}
            {currentChallengeIndex === 1 && <LabirintoGame onDone={handleChallengeComplete} />}
            {currentChallengeIndex === 2 && <AlvosGame onDone={handleChallengeComplete} />}
            {currentChallengeIndex === 3 && <GeniusGame onDone={handleChallengeComplete} />}
            {currentChallengeIndex === 4 && <OrdemGame onDone={handleChallengeComplete} />}
          </div>
        </div>
      )}

      {phase === 'final' && (
        <div className="space-y-6 py-6">
          <div className="w-16 h-16 bg-amber-400/20 border-2 border-amber-400 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            🏆
          </div>
          <h2 className="text-2xl font-black text-amber-400">DESAFIOS CONCLUÍDOS!</h2>
          <div className="bg-slate-950 p-6 rounded-2xl border border-purple-500/40 space-y-2">
            <span className="text-xs text-purple-300 font-bold block">Tempo Total nos 5 Desafios:</span>
            <div className="text-4xl font-black text-amber-400 font-mono">{FORMAT_TIME(totalTime)}</div>
            <p className="text-xs text-emerald-400 font-bold pt-2">🎉 +100 pontos adicionados ao seu placar!</p>
          </div>
          <button
            onClick={onBack}
            className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base uppercase shadow-xl transition"
          >
            Voltar para a Arena ➔
          </button>
        </div>
      )}
    </div>
  );
};

/* --- MINI GAMES --- */

// 1. Memoria
const MemoriaGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const E = ['🍕', '🎧', '🚀', '🎮', '🦊', '⚡'];
  const [cards, setCards] = useState(() => SHUFFLE([...E, ...E]));
  const [openCards, setOpenCards] = useState<number[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [lock, setLock] = useState(false);

  const handleCardClick = (idx: number) => {
    if (lock || openCards.includes(idx) || matched.includes(cards[idx])) return;
    const newOpen = [...openCards, idx];
    setOpenCards(newOpen);

    if (newOpen.length === 2) {
      const [i1, i2] = newOpen;
      if (cards[i1] === cards[i2]) {
        const newMatched = [...matched, cards[i1]];
        setMatched(newMatched);
        setOpenCards([]);
        if (newMatched.length === E.length) {
          setTimeout(onDone, 300);
        }
      } else {
        setLock(true);
        setTimeout(() => {
          setOpenCards([]);
          setLock(false);
        }, 600);
      }
    }
  };

  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.map((emoji, idx) => {
        const isOpen = openCards.includes(idx) || matched.includes(emoji);
        return (
          <button
            key={idx}
            onClick={() => handleCardClick(idx)}
            className={`aspect-square rounded-xl font-bold text-2xl flex items-center justify-center transition ${isOpen ? 'bg-white text-slate-950 border-2 border-purple-400' : 'bg-purple-600 text-white hover:bg-purple-500'}`}
          >
            {isOpen ? emoji : '❓'}
          </button>
        );
      })}
    </div>
  );
};

// 2. Labirinto
const LabirintoGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const N = 10;
  const S = 2 * N + 1;
  const [grid] = useState(() => {
    const g = Array.from({ length: S }, () => Array(S).fill(1));
    (function carve(x: number, y: number) {
      g[y][x] = 0;
      for (const [dx, dy] of SHUFFLE([[2, 0], [-2, 0], [0, 2], [0, -2]])) {
        const nx = x + dx, ny = y + dy;
        if (nx > 0 && ny > 0 && nx < S && ny < S && g[ny][nx]) {
          g[y + dy / 2][x + dx / 2] = 0;
          carve(nx, ny);
        }
      }
    })(1, 1);
    return g;
  });

  const [pos, setPos] = useState({ x: 1, y: 1 });
  const [hasKey, setHasKey] = useState(false);
  const [msg, setMsg] = useState('Pegue a chave 🔑 e chegue à saída 🚪.');

  const move = (dx: number, dy: number) => {
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (grid[ny]?.[nx] === 0) {
      setPos({ x: nx, y: ny });
      if (!hasKey && nx === 1 && ny === S - 2) {
        setHasKey(true);
        setMsg('Chave pega! Vá para a saída 🚪.');
      }
      if (nx === S - 2 && ny === 1) {
        if (hasKey) {
          onDone();
        } else {
          setMsg('A saída está trancada. Pegue a chave 🔑 primeiro.');
        }
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); move(0, -1); }
      if (e.key === 'ArrowDown' || e.key === 's') { e.preventDefault(); move(0, 1); }
      if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); move(-1, 0); }
      if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); move(1, 0); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pos, hasKey]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 1 : -1, 0);
    } else {
      move(0, dy > 0 ? 1 : -1);
    }
  };

  return (
    <div className="space-y-3 text-center">
      <p className="text-xs text-amber-300 font-bold">{msg}</p>
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-64 h-64 mx-auto bg-slate-900 border-2 border-purple-500 rounded-xl relative overflow-hidden grid touch-none"
        style={{ gridTemplateColumns: `repeat(${S}, 1fr)`, gridTemplateRows: `repeat(${S}, 1fr)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isPlayer = pos.x === c && pos.y === r;
            const isKey = !hasKey && c === 1 && r === S - 2;
            const isDoor = c === S - 2 && r === 1;

            let bg = cell === 1 ? 'bg-purple-900' : 'bg-slate-950';
            if (isPlayer) bg = 'bg-pink-500 rounded-full animate-pulse';

            return (
              <div key={`${r}-${c}`} className={`${bg} flex items-center justify-center text-[9px]`}>
                {isKey ? '🔑' : isDoor ? '🚪' : ''}
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-center gap-2 pt-2">
        <button onClick={() => move(0, -1)} className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-xl font-black">▲</button>
        <div className="flex gap-2">
          <button onClick={() => move(-1, 0)} className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-xl font-black">◀</button>
          <button onClick={() => move(0, 1)} className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-xl font-black">▼</button>
          <button onClick={() => move(1, 0)} className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-xl font-black">▶</button>
        </div>
      </div>
    </div>
  );
};

// 3. Alvos
const AlvosGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState({ x: 50, y: 50 });

  const spawnTarget = () => {
    setTarget({
      x: Math.floor(Math.random() * 75) + 10,
      y: Math.floor(Math.random() * 70) + 15
    });
  };

  const handleHit = () => {
    const next = count + 1;
    setCount(next);
    if (next >= 10) {
      onDone();
    } else {
      spawnTarget();
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-amber-400">Alvos: {count}/10</div>
      <div className="relative w-full h-60 bg-slate-950 rounded-2xl border border-purple-500/40 overflow-hidden cursor-crosshair">
        <button
          onClick={handleHit}
          style={{ left: `${target.x}%`, top: `${target.y}%` }}
          className="absolute w-12 h-12 rounded-full bg-pink-500 border-4 border-amber-400 transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_#ec4899] animate-bounce"
        />
      </div>
    </div>
  );
};

// 4. Genius
const GeniusGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [seq, setSeq] = useState<number[]>([Math.floor(Math.random() * 4)]);
  const [step, setStep] = useState(0);
  const [playingSeq, setPlayingSeq] = useState(true);
  const [activePad, setActivePad] = useState<number | null>(null);
  const [msg, setMsg] = useState('Observe a sequência...');

  useEffect(() => {
    setPlayingSeq(true);
    setStep(0);
    setMsg(`Rodada ${seq.length} de 6. Observe...`);
    seq.forEach((val, idx) => {
      setTimeout(() => {
        setActivePad(val);
        setTimeout(() => setActivePad(null), 300);
      }, 500 + idx * 600);
    });
    setTimeout(() => {
      setPlayingSeq(false);
      setMsg('Sua vez!');
    }, 500 + seq.length * 600);
  }, [seq]);

  const handlePad = (idx: number) => {
    if (playingSeq) return;
    setActivePad(idx);
    setTimeout(() => setActivePad(null), 200);

    if (idx !== seq[step]) {
      setMsg('Errou! Recomeçando rodada...');
      setTimeout(() => {
        setSeq([Math.floor(Math.random() * 4)]);
      }, 800);
      return;
    }

    const nextStep = step + 1;
    if (nextStep === seq.length) {
      if (seq.length === 6) {
        onDone();
      } else {
        setSeq([...seq, Math.floor(Math.random() * 4)]);
      }
    } else {
      setStep(nextStep);
    }
  };

  const colors = ['bg-pink-600', 'bg-amber-400', 'bg-teal-500', 'bg-purple-600'];

  return (
    <div className="space-y-4 text-center">
      <p className="text-xs font-bold text-amber-300">{msg}</p>
      <div className="grid grid-cols-2 gap-3 max-w-[240px] mx-auto">
        {colors.map((c, i) => (
          <button
            key={i}
            onClick={() => handlePad(i)}
            className={`h-24 rounded-2xl transition transform ${c} ${activePad === i ? 'scale-110 ring-4 ring-white opacity-100' : 'opacity-60'}`}
          />
        ))}
      </div>
    </div>
  );
};

// 5. Ordem Maluca
const OrdemGame: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [nums, setNums] = useState<number[]>(() => {
    let a;
    do {
      a = SHUFFLE([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    } while (a.every((v, i) => v === i + 1));
    return a;
  });
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleNumClick = (idx: number) => {
    if (selectedIdx === null) {
      setSelectedIdx(idx);
    } else {
      const next = [...nums];
      [next[selectedIdx], next[idx]] = [next[idx], next[selectedIdx]];
      setSelectedIdx(null);
      setNums(next);

      if (next.every((v, i) => v === i + 1)) {
        setTimeout(onDone, 300);
      }
    }
  };

  return (
    <div className="space-y-3 text-center">
      <p className="text-xs text-purple-200">Toque em dois números para trocá-los de lugar e ordená-los de 1 a 12.</p>
      <div className="grid grid-cols-4 gap-2 max-w-[280px] mx-auto">
        {nums.map((v, i) => (
          <button
            key={i}
            onClick={() => handleNumClick(i)}
            className={`aspect-square rounded-xl font-black text-lg transition ${selectedIdx === i ? 'bg-amber-400 text-slate-950 ring-2 ring-white scale-105' : 'bg-slate-900 border border-purple-500/40 text-purple-200 hover:bg-slate-800'}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
};
