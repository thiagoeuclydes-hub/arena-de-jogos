import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ArcadeParanoidProps {
  onBack: () => void;
  onAddScore: (points: number, gameType?: string) => void;
  maxUnlockedPhase?: number;
  onCompleteGame?: () => void;
}

const POINT_VALUES = [5, 10, 15, 20, 25, 30];

export const ArcadeParanoid: React.FC<ArcadeParanoidProps> = ({ onBack, onAddScore, onCompleteGame }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [balls, setBalls] = useState(3);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  useEffect(() => {
    if ((gameOver || gameWon) && onCompleteGame) {
      onCompleteGame();
    }
  }, [gameOver, gameWon]);

  useEffect(() => {
    let timerInterval: any = null;
    if (gameActive && !gameOver && !gameWon) {
      timerInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameActive(false);
            setGameOver(true);
            clearInterval(timerInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerInterval);
  }, [gameActive, gameOver, gameWon]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const W = 480;
    const H = 400;
    const BW = 44;
    const BH = 14;
    const GAP = 2;
    const OX = 11;
    const OY = 36;
    const PH = 8;
    const PY = H - 20;
    const R = 5;

    const LEVELS = [
      ["..........", "1111111111", "2222222222", "3333333333", "4444444444"],
      ["1.1.1.1.1.", ".2.2.2.2.2", "3.3.3.3.3.", ".4.4.4.4.4", "5.5.5.5.5."],
      ["XXXXXXXXXX", "1111111111", ".22....22.", "..3333333.", "4444444444"],
      ["1...55...1", "21..44..12", "321.33.123", "4321XX1234", "..........", "XXXXXXXXXX"],
      ["XXXXXXXXXX", "X11111111X", "X2XXXXXX2X", "X23333332X", "X2X4444X2X", "X23333332X", "XXXXXXXXXX"]
    ];

    let currentLevel = level;
    let currentScore = score;
    let currentBalls = balls;
    let bricks: any[] = [];
    let caps: any[] = [];
    let state = 'ready'; // 'ready', 'play', 'over', 'win', 'next'
    let px = W / 2 - 35;
    let pw = 70;
    let ball = { x: px + pw / 2, y: PY - R, vx: 0, vy: 0 };
    let keys: { [k: string]: number } = {};
    let wideT = 0;
    let slowT = 0;
    let localMsg = '';

    function loadLvl(l: number) {
      currentLevel = l;
      setLevel(l);
      bricks = [];
      LEVELS[l].forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch === ".") return;
        const x = ch === "X";
        const randomPts = POINT_VALUES[Math.floor(Math.random() * POINT_VALUES.length)];
        bricks.push({
          x: OX + c * (BW + GAP),
          y: OY + r * (BH + GAP),
          col: x ? -1 : +ch - 1,
          hp: x ? 2 : 1,
          pts: randomPts,
          alive: true
        });
      }));
      caps = [];
      wideT = slowT = 0;
      pw = 70;
      ready();
    }

    function ready() {
      state = "ready";
      ball = { x: px + pw / 2, y: PY - R, vx: 0, vy: 0 };
    }

    function launch() {
      if (state == "ready") {
        const a = (Math.random() * 40 - 20) * Math.PI / 180;
        const s = 4 + currentLevel * 0.5;
        ball.vx = s * Math.sin(a);
        ball.vy = -s * Math.cos(a);
        state = "play";
        localMsg = "";
      } else if (state == "next") {
        if (currentLevel + 1 < LEVELS.length) {
          loadLvl(currentLevel + 1);
          setTimeLeft(30);
          setGameActive(true);
        } else {
          setGameWon(true);
          setGameActive(false);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
      }
    }

    let last = performance.now();

    function step(f: number, dt: number) {
      const mv = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      px = Math.max(0, Math.min(W - pw, px + mv * 7 * f));
      if (wideT > 0) {
        wideT -= dt;
        if (wideT <= 0) pw = 70;
      }
      if (slowT > 0) {
        slowT -= dt;
      }

      if (state == "ready") {
        ball.x = px + pw / 2;
        ball.y = PY - R;
        return;
      }
      if (state != "play") return;

      const k = f * (slowT > 0 ? 0.7 : 1);
      ball.x += ball.vx * k;
      ball.y += ball.vy * k;

      if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }

      if (ball.vy > 0 && ball.y + R >= PY && ball.y - R <= PY + PH && ball.x >= px - R && ball.x <= px + pw + R) {
        const t = Math.max(-1, Math.min(1, (ball.x - (px + pw / 2)) / (pw / 2)));
        const a = t * 60 * Math.PI / 180;
        const s = 4 + currentLevel * 0.5;
        ball.vx = s * Math.sin(a);
        ball.vy = -s * Math.cos(a);
        ball.y = PY - R;
      }

      if (ball.y > H + R) {
        currentBalls--;
        setBalls(currentBalls);
        if (currentBalls <= 0) {
          state = "over";
          setGameOver(true);
          setGameActive(false);
        } else {
          ready();
        }
        return;
      }

      for (const b of bricks) {
        if (!b.alive) continue;
        const cx = Math.max(b.x, Math.min(ball.x, b.x + BW));
        const cy = Math.max(b.y, Math.min(ball.y, b.y + BH));
        const dx = ball.x - cx;
        const dy = ball.y - cy;
        if (dx * dx + dy * dy < R * R) {
          if (Math.abs(dx) > Math.abs(dy)) ball.vx = (dx > 0 ? 1 : -1) * Math.abs(ball.vx);
          else ball.vy = (dy >= 0 ? 1 : -1) * Math.abs(ball.vy);
          b.hp--;
          if (b.hp <= 0) {
            b.alive = false;
            const ptsGained = b.pts;
            currentScore += ptsGained;
            setScore(currentScore);
            onAddScore(ptsGained, 'paranoid');

            if (Math.random() < 0.14) {
              caps.push({ x: b.x + BW / 2, y: b.y, t: "LVS"[Math.floor(Math.random() * 3)] });
            }
          } else {
            currentScore += 5;
            setScore(currentScore);
            onAddScore(5, 'paranoid');
          }
          break;
        }
      }

      if (!bricks.some(b => b.alive)) {
        caps = [];
        if (currentLevel >= LEVELS.length - 1) {
          state = "win";
          setGameWon(true);
          setGameActive(false);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } else {
          state = "next";
          localMsg = `FASE ${currentLevel + 1} COMPLETA!`;
        }
      }

      for (const c of caps) {
        c.y += 2 * f;
        if (c.y > PY - 4 && c.y < PY + PH + 8 && c.x > px - 8 && c.x < px + pw + 8 && !c.d) {
          c.d = 1;
          if (c.t == "L") { pw = 110; wideT = 10000; }
          if (c.t == "V") { currentBalls = Math.min(currentBalls + 1, 9); setBalls(currentBalls); }
          if (c.t == "S") { slowT = 10000; }
          currentScore += 50;
          setScore(currentScore);
          onAddScore(50, 'paranoid');
        }
      }
      caps = caps.filter(c => !c.d && c.y < H + 10);
    }

    function draw() {
      if (!ctx) return;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      for (const b of bricks) {
        if (!b.alive) continue;
        const COLORS = ["#d22", "#26d", "#2b2", "#2bb", "#c3c"];
        ctx.fillStyle = b.col < 0 ? (b.hp > 1 ? "#aaa" : "#666") : COLORS[b.col];
        ctx.fillRect(b.x, b.y, BW, BH);
        ctx.fillStyle = "rgba(255,255,255,.35)";
        ctx.fillRect(b.x, b.y, BW, 2);
        ctx.fillStyle = "rgba(0,0,0,.35)";
        ctx.fillRect(b.x, b.y + BH - 2, BW, 2);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${b.pts}p`, b.x + BW / 2, b.y + BH / 2 + 3);
      }

      for (const c of caps) {
        ctx.fillStyle = "#fc0";
        ctx.fillRect(c.x - 8, c.y - 6, 16, 12);
        ctx.fillStyle = "#000";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(c.t, c.x, c.y + 4);
      }

      ctx.fillStyle = "#fff";
      ctx.fillRect(px, PY, pw, PH);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, R, 0, 7);
      ctx.fill();

      ctx.textAlign = "center";
      if (state == "ready" && !localMsg) {
        ctx.fillStyle = "#777";
        ctx.font = "12px monospace";
        ctx.fillText(`FASE ${currentLevel + 1} – CLIQUE PARA LANÇAR`, W / 2, H / 2 + 70);
      }
      if (localMsg) {
        ctx.fillStyle = "rgba(0,0,0,.7)";
        ctx.fillRect(0, H / 2 - 40, W, 90);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px monospace";
        ctx.fillText(localMsg, W / 2, H / 2);
        ctx.font = "12px monospace";
        ctx.fillText("CLIQUE PARA A PRÓXIMA FASE", W / 2, H / 2 + 28);
      }
    }

    loadLvl(0);

    let animId: number;
    const loop = (t: number) => {
      const dt = Math.min(50, t - last);
      last = t;
      step(dt / 16.67, dt);
      draw();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    const setX = (cx: number) => {
      const r = cv.getBoundingClientRect();
      px = Math.max(0, Math.min(W - pw, (cx - r.left) / r.width * W - pw / 2));
    };

    const handleMouseMove = (e: MouseEvent) => setX(e.clientX);
    const handleTouchMove = (e: TouchEvent) => { e.preventDefault(); setX(e.touches[0].clientX); };
    const handleTouchStart = (e: TouchEvent) => { setX(e.touches[0].clientX); };
    const handleClick = () => launch();
    const handleTouchEnd = (e: TouchEvent) => { e.preventDefault(); launch(); };
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key] = 1;
      if (e.key == " ") { e.preventDefault(); launch(); }
      if (e.key.startsWith("Arrow")) e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.key] = 0; };

    cv.addEventListener("mousemove", handleMouseMove);
    cv.addEventListener("touchmove", handleTouchMove, { passive: false });
    cv.addEventListener("touchstart", handleTouchStart, { passive: true });
    cv.addEventListener("click", handleClick);
    cv.addEventListener("touchend", handleTouchEnd, { passive: false });
    addEventListener("keydown", handleKeyDown);
    addEventListener("keyup", handleKeyUp);

    return () => {
      cancelAnimationFrame(animId);
      cv.removeEventListener("mousemove", handleMouseMove);
      cv.removeEventListener("touchmove", handleTouchMove);
      cv.removeEventListener("touchstart", handleTouchStart);
      cv.removeEventListener("click", handleClick);
      cv.removeEventListener("touchend", handleTouchEnd);
      removeEventListener("keydown", handleKeyDown);
      removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div className="bg-[#0f1f18] border-2 border-emerald-500/40 rounded-3xl p-6 md:p-8 max-w-4xl mx-auto w-full text-center space-y-6 shadow-2xl font-sans text-white">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center space-x-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar à Arena</span>
        </button>

        <div className="flex items-center space-x-4 flex-wrap justify-end">
          <span className="text-xs font-bold bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-800 text-emerald-300">
            Fase {level + 1} / 5 (30s)
          </span>
          <span className={`text-xs font-black px-3 py-1.5 rounded-xl border ${timeLeft <= 10 ? 'bg-red-500/30 text-red-400 border-red-500 animate-pulse' : 'bg-slate-900 text-amber-300 border-amber-500/40'}`}>
            ⏱️ Tempo: {timeLeft}s
          </span>
          <div className="bg-amber-400/20 border border-amber-400/40 px-4 py-1.5 rounded-xl">
            <span className="text-xs text-amber-200 font-bold mr-2">Score:</span>
            <span className="text-lg font-black text-amber-400">{score} pts</span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-2xl font-black text-amber-400">🧱 ARCADÃO PARANOID</h3>
        <p className="text-xs text-emerald-200/80">
          Destrua os tijolos (Valores aleatórios: 5, 10, 15, 20, 25 e 30 pts) em 30 segundos!
        </p>
      </div>

      <div className="relative w-full max-w-[600px] mx-auto aspect-[480/400] bg-black rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl">
        <canvas ref={canvasRef} width={480} height={400} className="w-full h-full block touch-none" />

        {gameWon && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 p-6">
            <div className="text-3xl font-black text-emerald-400">🎉 VOCÊ VENCEU AS FASES!</div>
            <p className="text-sm text-amber-300 font-bold">Pontuação Total: {score} pts</p>
            <p className="text-xs text-emerald-300/80">O jogo foi concluído. Aguarde o professor liberar novamente para jogar outra partida.</p>
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm uppercase shadow-xl transition"
            >
              Voltar à Arena ➔
            </button>
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 p-6">
            <div className="text-3xl font-black text-red-500">⏰ TEMPO ESGOTADO / FIM DE JOGO!</div>
            <p className="text-sm text-cyan-300 font-bold">Pontuação Final: {score} pts</p>
            <p className="text-xs text-emerald-300/80">Fim de jogo. Aguarde o professor liberar novamente.</p>
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm uppercase shadow-xl transition"
            >
              Voltar à Arena ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
