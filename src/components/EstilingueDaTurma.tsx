import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

interface EstilingueDaTurmaProps {
  onBack: () => void;
  onAddScore: (points: number) => void;
  maxUnlockedPhase?: number;
}

export const EstilingueDaTurma: React.FC<EstilingueDaTurmaProps> = ({ onBack, onAddScore, maxUnlockedPhase = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameScore, setGameScore] = useState(0);
  const [birdsLeft, setBirdsLeft] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);

  useEffect(() => {
    const Matter = (window as any).Matter;
    if (!Matter) {
      console.error("Matter.js not loaded");
      return;
    }

    const { Engine, Bodies, Composite, Body, Vector } = Matter;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const A = { x: 130, y: 318 };
    const GY = 410;
    const MAXD = 85;
    const MAT = {
      wood: { hp: 70, d: 0.0012, c: '#c98a3e', e: '#7a4a14', pts: 2 },
      glass: { hp: 30, d: 0.0015, c: 'rgba(150,220,240,.75)', e: '#5aa9c4', pts: 2 },
      stone: { hp: 170, d: 0.003, c: '#9a9a9a', e: '#555', pts: 5 }
    };

    let eng = Engine.create();
    let blocks: any[] = [];
    let pigs: any[] = [];
    let bird: any = null;
    let left = 4;
    let state = 'aim'; // 'aim', 'fly', 'wait', 'end'
    let fr = 0;
    let still = 0;
    let drag = false;
    let lvScore = 0;
    let shotsTaken = 0;

    const LV = [
      {
        birds: 4,
        f: (a: any) => {
          col(a, 'wood', 570, 385, 14, 50);
          col(a, 'wood', 630, 385, 14, 50);
          col(a, 'wood', 600, 354, 100, 12);
          pig(a, 600, 394);
          pig(a, 600, 334);
        }
      },
      {
        birds: 5,
        f: (a: any) => {
          [560, 620, 680].forEach(x => col(a, 'wood', x, 380, 14, 60));
          col(a, 'glass', 590, 346, 80, 12);
          col(a, 'glass', 650, 346, 80, 12);
          col(a, 'stone', 620, 322, 14, 36);
          pig(a, 590, 394);
          pig(a, 650, 394);
          pig(a, 620, 292);
        }
      },
      {
        birds: 5,
        f: (a: any) => {
          [540, 600, 660, 720].forEach(x => col(a, 'glass', x, 380, 14, 60));
          col(a, 'wood', 570, 346, 80, 12);
          col(a, 'wood', 690, 346, 80, 12);
          col(a, 'stone', 570, 316, 14, 50);
          col(a, 'stone', 690, 316, 14, 50);
          col(a, 'wood', 630, 284, 200, 12);
          pig(a, 570, 394);
          pig(a, 630, 394);
          pig(a, 690, 394);
          pig(a, 630, 264);
        }
      },
      {
        birds: 6,
        f: (a: any) => {
          [520, 580, 640, 700].forEach(x => col(a, 'stone', x, 380, 14, 65));
          col(a, 'wood', 550, 340, 120, 12);
          col(a, 'wood', 670, 340, 120, 12);
          col(a, 'stone', 610, 305, 14, 50);
          col(a, 'glass', 610, 270, 90, 12);
          pig(a, 550, 394);
          pig(a, 670, 394);
          pig(a, 610, 350);
          pig(a, 610, 250);
        }
      },
      {
        birds: 6,
        f: (a: any) => {
          [500, 560, 620, 680, 740].forEach(x => col(a, 'wood', x, 380, 14, 60));
          col(a, 'stone', 530, 340, 100, 12);
          col(a, 'stone', 650, 340, 100, 12);
          col(a, 'glass', 590, 305, 14, 45);
          col(a, 'glass', 710, 305, 14, 45);
          col(a, 'wood', 650, 270, 240, 12);
          pig(a, 530, 394);
          pig(a, 650, 394);
          pig(a, 590, 350);
          pig(a, 710, 350);
        }
      },
      {
        birds: 6,
        f: (a: any) => {
          [520, 580, 640, 700].forEach(x => col(a, 'stone', x, 380, 14, 70));
          col(a, 'stone', 550, 335, 120, 12);
          col(a, 'stone', 670, 335, 120, 12);
          col(a, 'wood', 610, 290, 160, 12);
          col(a, 'glass', 610, 250, 80, 12);
          pig(a, 550, 394);
          pig(a, 670, 394);
          pig(a, 610, 350);
          pig(a, 610, 230);
        }
      }
    ];

    function col(a: any, t: string, x: number, y: number, w: number, h: number) {
      const m = (MAT as any)[t];
      const b = Bodies.rectangle(x, y, w, h, { density: m.d, friction: 0.6, restitution: 0.05 });
      const o = { b, t, hp: m.hp, maxHp: m.hp, w, h, pts: m.pts, k: 'blk' };
      b.plugin.o = o;
      blocks.push(o);
      Composite.add(eng.world, b);
    }

    function pig(a: any, x: number, y: number) {
      const b = Bodies.circle(x, y, 15, { density: 0.0012, friction: 0.5, restitution: 0.1 });
      const o = { b, hp: 22, maxHp: 22, pts: 10, k: 'pig' };
      b.plugin.o = o;
      pigs.push(o);
      Composite.add(eng.world, b);
    }

    function beep(f = 400, d = 0.1) {
      try {
        const AC = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = AC.createOscillator();
        const g = AC.createGain();
        o.type = 'square';
        o.frequency.value = f;
        g.gain.value = 0.05;
        g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + d);
        o.connect(g);
        g.connect(AC.destination);
        o.start();
        o.stop(AC.currentTime + d);
      } catch (e) {}
    }

    function loadLevel(phaseIdx: number) {
      eng = Engine.create();
      blocks = [];
      pigs = [];
      lvScore = 0;
      shotsTaken = 0;
      Composite.add(eng.world, Bodies.rectangle(400, GY + 30, 2000, 60, { isStatic: true, friction: 0.9 }));
      const L = LV[phaseIdx] || LV[0];
      L.f(eng);
      left = L.birds;
      setBirdsLeft(left);
      nextBird();

      Matter.Events.on(eng, 'collisionStart', (e: any) => {
        e.pairs.forEach((p: any) => {
          const v = Vector.magnitude(Vector.sub(p.bodyA.velocity, p.bodyB.velocity));
          if (v < 2.5) return;
          let d = (v - 2.5) * 6;
          if (p.bodyA === bird || p.bodyB === bird) { d *= 2.5; beep(180, 0.08); }
          [p.bodyA, p.bodyB].forEach(b => {
            const o = b.plugin.o;
            if (o) o.hp -= d;
          });
        });
      });
    }

    function nextBird() {
      if (left <= 0) {
        bird = null;
        state = 'wait';
        fr = 0;
        return;
      }
      bird = Bodies.circle(A.x, A.y, 14, { density: 0.004, restitution: 0.3, friction: 0.4, frictionAir: 0.004, isStatic: true });
      Composite.add(eng.world, bird);
      state = 'aim';
      left--;
      setBirdsLeft(left + 1);
      fr = 0;
      still = 0;
    }

    const pt = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      return { x: (e.clientX - r.left) * 800 / r.width, y: (e.clientY - r.top) * 450 / r.height };
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (state !== 'aim' || !bird) return;
      const p = pt(e);
      if (Math.hypot(p.x - bird.position.x, p.y - bird.position.y) < 55) {
        drag = true;
        cv.setPointerCapture(e.pointerId);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!drag || !bird) return;
      const p = pt(e);
      let dx = p.x - A.x;
      let dy = p.y - A.y;
      let d = Math.hypot(dx, dy);
      if (d > MAXD) {
        dx *= MAXD / d;
        dy *= MAXD / d;
      }
      Body.setPosition(bird, { x: A.x + dx, y: A.y + dy });
    };

    const handlePointerUp = () => {
      if (!drag || !bird) return;
      drag = false;
      const dx = A.x - bird.position.x;
      const dy = A.y - bird.position.y;
      if (Math.hypot(dx, dy) < 14) {
        Body.setPosition(bird, { x: A.x, y: A.y });
        return;
      }
      shotsTaken++;
      Body.setStatic(bird, false);
      Body.setVelocity(bird, { x: dx * 0.2, y: dy * 0.2 });
      state = 'fly';
      fr = 0;
      still = 0;
      beep(500, 0.15);
    };

    cv.addEventListener('pointerdown', handlePointerDown);
    cv.addEventListener('pointermove', handlePointerMove);
    cv.addEventListener('pointerup', handlePointerUp);

    function step() {
      Engine.update(eng, 1000 / 60);

      [blocks, pigs].forEach((arr, i) => {
        for (let j = arr.length - 1; j >= 0; j--) {
          const o = arr[j];
          if (o.hp <= 0 || o.b.position.x > 900 || o.b.position.y > 520) {
            Composite.remove(eng.world, o.b);
            arr.splice(j, 1);
            const earned = o.pts || (i ? 10 : 2);
            lvScore += earned;
            setGameScore(prev => prev + earned);
            onAddScore(earned);
            beep(i ? 700 : 300, 0.1);
          }
        }
      });

      fr++;
      if (state === 'fly' && bird) {
        const s = Vector.magnitude(bird.velocity);
        still = s < 0.4 ? still + 1 : 0;
        if (still > 50 || fr > 480 || bird.position.x > 900 || bird.position.y > 500) {
          Composite.remove(eng.world, bird);
          bird = null;
          state = 'wait';
          fr = 0;
        }
      } else if (state === 'wait' && fr > 70) {
        if (!pigs.length) {
          state = 'end';
          setGameWon(true);
          const bonus = shotsTaken === 1 ? 15 : shotsTaken === 2 ? 10 : shotsTaken === 3 ? 5 : shotsTaken === 4 ? 3 : 1;
          setGameScore(prev => prev + bonus);
          onAddScore(bonus);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } else if (left > 0) {
          nextBird();
        } else {
          state = 'end';
          setGameOver(true);
        }
      }
    }

    function face(r: number, c: string) {
      ctx!.fillStyle = c;
      ctx!.beginPath();
      ctx!.arc(0, 0, r, 0, 7);
      ctx!.fill();
      ctx!.strokeStyle = '#0004';
      ctx!.lineWidth = 2;
      ctx!.stroke();
      ctx!.fillStyle = '#fff';
      [-r * 0.35, r * 0.35].forEach(x => {
        ctx!.beginPath();
        ctx!.arc(x, -r * 0.2, r * 0.3, 0, 7);
        ctx!.fill();
      });
      ctx!.fillStyle = '#000';
      [-r * 0.3, r * 0.4].forEach(x => {
        ctx!.beginPath();
        ctx!.arc(x, -r * 0.2, r * 0.12, 0, 7);
        ctx!.fill();
      });
    }

    function drawBird(x: number, y: number, a = 0) {
      ctx!.save();
      ctx!.translate(x, y);
      ctx!.rotate(a);
      face(14, '#d92b2b');
      ctx!.fillStyle = '#f5b324';
      ctx!.beginPath();
      ctx!.moveTo(8, 2);
      ctx!.lineTo(18, 5);
      ctx!.lineTo(8, 8);
      ctx!.fill();
      ctx!.restore();
    }

    function rr(w: number, h: number, c: string, e: string) {
      ctx!.fillStyle = c;
      ctx!.strokeStyle = e;
      ctx!.lineWidth = 2;
      ctx!.fillRect(-w / 2, -h / 2, w, h);
      ctx!.strokeRect(-w / 2, -h / 2, w, h);
    }

    function draw() {
      const g = ctx!.createLinearGradient(0, 0, 0, GY);
      g.addColorStop(0, '#7fd4e8');
      g.addColorStop(1, '#d8f3e4');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, 800, 450);

      ctx!.fillStyle = '#fff';
      [[120, 60], [420, 40], [660, 80]].forEach(([x, y]) => {
        ctx!.beginPath();
        ctx!.ellipse(x, y, 45, 14, 0, 0, 7);
        ctx!.ellipse(x + 25, y - 8, 28, 12, 0, 0, 7);
        ctx!.fill();
      });

      ctx!.fillStyle = '#4fb98a';
      ctx!.beginPath();
      ctx!.moveTo(0, GY);
      ctx!.quadraticCurveTo(150, 200, 330, GY);
      ctx!.fill();
      ctx!.fillStyle = '#35a373';
      ctx!.beginPath();
      ctx!.moveTo(300, GY);
      ctx!.quadraticCurveTo(560, 170, 820, GY);
      ctx!.fill();

      ctx!.fillStyle = '#4aa3d8';
      ctx!.fillRect(0, GY - 14, 800, 14);
      ctx!.fillStyle = '#6bbf3a';
      ctx!.fillRect(0, GY, 800, 40);
      ctx!.fillStyle = '#7a4f24';
      ctx!.fillRect(0, GY + 14, 800, 40);

      for (let i = 0; i < left; i++) drawBird(60 + i * 24, GY - 14);

      ctx!.strokeStyle = '#5a3515';
      ctx!.lineWidth = 10;
      ctx!.lineCap = 'round';
      ctx!.beginPath();
      ctx!.moveTo(A.x, GY);
      ctx!.lineTo(A.x, A.y + 25);
      ctx!.moveTo(A.x, A.y + 25);
      ctx!.lineTo(A.x - 14, A.y - 8);
      ctx!.moveTo(A.x, A.y + 25);
      ctx!.lineTo(A.x + 14, A.y - 8);
      ctx!.stroke();

      blocks.forEach(o => {
        const b = o.b;
        const m = (MAT as any)[o.t];
        ctx!.save();
        ctx!.translate(b.position.x, b.position.y);
        ctx!.rotate(b.angle);
        ctx!.globalAlpha = 0.55 + 0.45 * Math.max(0, o.hp) / m.hp;
        rr(o.w, o.h, m.c, m.e);
        ctx!.restore();
      });

      pigs.forEach(o => {
        ctx!.save();
        ctx!.translate(o.b.position.x, o.b.position.y);
        ctx!.rotate(o.b.angle);
        face(15, '#6cc24a');
        ctx!.fillStyle = '#4a9a30';
        ctx!.beginPath();
        ctx!.ellipse(0, 6, 6, 4, 0, 0, 7);
        ctx!.fill();
        ctx!.restore();
      });

      if (bird) {
        const p = bird.position;
        if (state === 'aim') {
          ctx!.strokeStyle = '#3a1f0a';
          ctx!.lineWidth = 4;
          ctx!.beginPath();
          ctx!.moveTo(A.x - 14, A.y - 8);
          ctx!.lineTo(p.x, p.y);
          ctx!.lineTo(A.x + 14, A.y - 8);
          ctx!.stroke();
          if (drag) {
            let vx = (A.x - p.x) * 0.2;
            let vy = (A.y - p.y) * 0.2;
            let x = p.x;
            let y = p.y;
            ctx!.fillStyle = '#fff';
            for (let i = 0; i < 40; i++) {
              vy += 0.278;
              x += vx;
              y += vy;
              if (i % 3 === 0) {
                ctx!.beginPath();
                ctx!.arc(x, y, 3, 0, 7);
                ctx!.fill();
              }
            }
          }
        }
        drawBird(p.x, p.y, bird.angle);
      }
    }

    loadLevel(activePhaseIndex);

    let animId: number;
    const loop = () => {
      step();
      draw();
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      cv.removeEventListener('pointerdown', handlePointerDown);
      cv.removeEventListener('pointermove', handlePointerMove);
      cv.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activePhaseIndex]);

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

        <div className="flex items-center space-x-4">
          <span className="text-xs font-bold bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-800 text-emerald-300">
            Fase {activePhaseIndex + 1} / 6 (Liberada pelo Professor)
          </span>
          <div className="bg-amber-400/20 border border-amber-400/40 px-4 py-1.5 rounded-xl">
            <span className="text-xs text-amber-200 font-bold mr-2">Pontos Ganhos:</span>
            <span className="text-lg font-black text-amber-400">{gameScore} pts</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-black text-amber-400">🐦 ESTILINGUE DA TURMA</h3>
        <p className="text-xs text-emerald-200/80">
          Arraste o pássaro para trás e solte para derrubar blocos e monstros! <br />
          <span className="text-cyan-300 font-bold">1 bola = +15 pts | 2 bolas = +10 pts | 3 bolas = +5 pts | 4 bolas = +3 pts</span>
        </p>
      </div>

      {/* Phase selection unlocked by professor */}
      <div className="flex justify-center gap-2 flex-wrap">
        {[0, 1, 2, 3, 4, 5].map(idx => {
          const unlocked = idx <= maxUnlockedPhase;
          const active = activePhaseIndex === idx;
          return (
            <button
              key={idx}
              disabled={!unlocked}
              onClick={() => {
                setActivePhaseIndex(idx);
                setGameOver(false);
                setGameWon(false);
              }}
              className={`px-3 py-2 rounded-xl font-black text-xs transition ${active ? 'bg-amber-400 text-slate-950 scale-105 ring-2 ring-white' : unlocked ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'}`}
            >
              {unlocked ? `Fase ${idx + 1} 🔓` : `Fase ${idx + 1} 🔒`}
            </button>
          );
        })}
      </div>

      <div className="relative w-full max-w-[800px] mx-auto aspect-[16/9] bg-black rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl">
        <canvas ref={canvasRef} width={800} height={450} className="w-full h-full block touch-none" />

        {gameWon && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 p-6">
            <div className="text-3xl font-black text-emerald-400">🎉 FASE CONCLUÍDA COM SUCESSO!</div>
            <p className="text-sm text-amber-300 font-bold">Você somou {gameScore} pontos nesta partida!</p>
            {activePhaseIndex < 5 && activePhaseIndex < maxUnlockedPhase && (
              <button
                onClick={() => {
                  setActivePhaseIndex(prev => prev + 1);
                  setGameWon(false);
                }}
                className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm uppercase shadow-xl transition"
              >
                Avançar para Fase {activePhaseIndex + 2} ➔
              </button>
            )}
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 p-6">
            <div className="text-3xl font-black text-red-500">😅 FIM DOS PÁSSAROS!</div>
            <p className="text-sm text-cyan-300 font-bold">Tente novamente quando o professor liberar ou refaça a fase.</p>
            <button
              onClick={() => {
                setGameOver(false);
                setActivePhaseIndex(activePhaseIndex);
              }}
              className="px-6 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-sm uppercase shadow-xl transition"
            >
              Tentar Novamente 🔄
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
