import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';

const playSound = (type, muted) => {
  if (muted) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'switch') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.085);
    } else if (type === 'score') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.125);
    } else if (type === 'crash') {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(190, now);
      subOsc.frequency.exponentialRampToValueAtTime(34, now + 0.32);

      subGain.gain.setValueAtTime(0.45, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

      subOsc.start(now);
      subOsc.stop(now + 0.35);

      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 0.22));
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(1.2, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.32, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.225);
    }
  } catch (e) {
    // Ses bağlamı engellenirse sessiz devam et
  }
};

export default function App() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('START');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('neon_orbit_highscore') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });
  const [muted, setMuted] = useState(false);

  const gameStateRef = useRef('START');
  const mutedRef = useRef(false);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const gameRef = useRef({
    angle: 0,
    isOuter: true,
    currentR: null,
    speed: 0.0055,
    obstacles: [],
    orbs: [],
    particles: [],
    trail: [],
    shake: 0,
    score: 0,
    combo: 1,
    lastSpawnAngle: 1.4,
    hueShift: 180,
  });

  const createParticles = (x, y, color, count = 14) => {
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const v = 2 + Math.random() * 4.5;
      gameRef.current.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  };

  const spawnEntities = (baseAngle) => {
    const g = gameRef.current;
    const minGap = 1.65;
    const randomExtra = Math.random() * 0.75;
    const obsAngle = Math.max(baseAngle + minGap, g.angle + 1.55) + randomExtra;
    const obsOuter = Math.random() > 0.5;

    g.obstacles.push({
      angle: obsAngle,
      isOuter: obsOuter,
      passed: false,
    });

    if (Math.random() > 0.25) {
      g.orbs.push({
        angle: obsAngle + 0.45,
        isOuter: !obsOuter,
        collected: false,
      });
    }
    g.lastSpawnAngle = obsAngle;
  };

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.angle = 0;
    g.isOuter = true;
    g.currentR = null;
    g.speed = 0.0055;
    g.obstacles = [];
    g.orbs = [];
    g.particles = [];
    g.trail = [];
    g.shake = 0;
    g.score = 0;
    g.combo = 1;
    g.lastSpawnAngle = 1.4;

    for (let i = 0; i < 4; i++) {
      spawnEntities(g.lastSpawnAngle);
    }

    setScore(0);
    setCombo(1);
    setGameState('PLAYING');
    gameStateRef.current = 'PLAYING';
    playSound('switch', mutedRef.current);
  }, []);

  const handleTap = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return;
    gameRef.current.isOuter = !gameRef.current.isOuter;
    playSound('switch', mutedRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        if (gameStateRef.current === 'PLAYING') handleTap();
        else startGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTap, startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const minDim = Math.max(120, Math.min(w, h));

      const outerR = minDim * 0.34;
      const innerR = minDim * 0.21;
      const coreR = minDim * 0.08;

      const g = gameRef.current;
      const currentState = gameStateRef.current;
      const isMuted = mutedRef.current;

      g.hueShift = (g.hueShift + 0.2) % 360;

      ctx.fillStyle = '#050814';
      ctx.fillRect(0, 0, w, h);

      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, outerR * 1.6);
      bgGrad.addColorStop(0, `hsla(${g.hueShift}, 85%, 20%, 0.35)`);
      bgGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
      bgGrad.addColorStop(1, 'rgba(5, 8, 20, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      if (g.shake > 0) {
        ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);
        g.shake *= 0.88;
        if (g.shake < 0.5) g.shake = 0;
      }

      [outerR, innerR].forEach((r, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = idx === 0 ? 'rgba(34, 211, 238, 0.25)' : 'rgba(250, 204, 21, 0.22)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreR);
      coreGrad.addColorStop(0, '#fef08a');
      coreGrad.addColorStop(0.5, '#06b6d4');
      coreGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.fill();

      if (currentState === 'PLAYING') {
        const dynamicSpeed = 0.0055 + Math.min(0.0185, Math.pow(Math.max(0, g.score), 0.75) * 0.00022);
        g.speed = dynamicSpeed;
        g.angle += g.speed;

        while (g.lastSpawnAngle < g.angle + Math.PI * 2) {
          spawnEntities(g.lastSpawnAngle);
        }
      }

      const targetR = g.isOuter ? outerR : innerR;
      if (g.currentR === null) g.currentR = targetR;
      g.currentR += (targetR - g.currentR) * 0.35;
      const playerR = g.currentR;

      const px = cx + Math.cos(g.angle) * playerR;
      const py = cy + Math.sin(g.angle) * playerR;

      if (currentState === 'PLAYING') {
        g.trail.push({ x: px, y: py });
        if (g.trail.length > 14) g.trail.shift();
      }
      g.trail.forEach((pt, i) => {
        const ratio = i / g.trail.length;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.5, ratio * 8), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${ratio * 0.45})`;
        ctx.fill();
      });

      g.orbs.forEach((orb) => {
        if (orb.collected) return;
        const r = orb.isOuter ? outerR : innerR;
        const ox = cx + Math.cos(orb.angle) * r;
        const oy = cy + Math.sin(orb.angle) * r;

        ctx.beginPath();
        ctx.arc(ox, oy, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15';
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (currentState === 'PLAYING') {
          const dist = Math.hypot(px - ox, py - oy);
          if (dist < 22) {
            orb.collected = true;
            g.combo = Math.min(5, g.combo + 1);
            g.score += 10 * g.combo;
            setScore(g.score);
            setCombo(g.combo);
            playSound('score', isMuted);
            createParticles(ox, oy, '#facc15', 12);
          }
        }
      });

      g.obstacles.forEach((obs) => {
        const r = obs.isOuter ? outerR : innerR;
        const ex = cx + Math.cos(obs.angle) * r;
        const ey = cy + Math.sin(obs.angle) * r;

        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(obs.angle);
        ctx.fillStyle = '#fb923c';
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.roundRect(-9, -14, 18, 28, 6);
        ctx.fill();
        ctx.restore();

        if (currentState === 'PLAYING') {
          if (!obs.passed && obs.angle < g.angle - 0.15) {
            obs.passed = true;
            g.score += 1;
            setScore(g.score);
          }

          const dist = Math.hypot(px - ex, py - ey);
          if (dist < 14.5) {
            g.shake = 18;
            playSound('crash', isMuted);
            createParticles(px, py, '#fb923c', 28);
            setGameState('GAMEOVER');
            gameStateRef.current = 'GAMEOVER';
            setHighScore((prev) => {
              const best = Math.max(prev, g.score);
              try {
                localStorage.setItem('neon_orbit_highscore', best.toString());
              } catch {
                // Depolama hatası yoksayılır
              }
              return best;
            });
          }
        }
      });

      g.obstacles = g.obstacles.filter((o) => o.angle > g.angle - 1.5);
      g.orbs = g.orbs.filter((o) => !o.collected && o.angle > g.angle - 1.5);

      if (currentState !== 'GAMEOVER') {
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.shadowColor = '#22d3ee';
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      g.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.035;
        if (p.life > 0) {
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      });
      g.particles = g.particles.filter((p) => p.life > 0);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      onPointerDown={handleTap}
      className="relative w-full h-[100dvh] overflow-hidden cursor-pointer select-none bg-[#050814]"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />

      <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/70 backdrop-blur-md border border-cyan-500/30 px-4 py-2 rounded-2xl">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-300 font-bold text-lg">{highScore}</span>
        </div>

        {gameState === 'PLAYING' && (
          <div className="flex flex-col items-center">
            <span className="text-4xl font-black text-white tracking-wider drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]">
              {score}
            </span>
            {combo > 1 && (
              <span className="text-xs font-extrabold text-yellow-400 bg-yellow-400/10 border border-yellow-400/40 px-2.5 py-0.5 rounded-full mt-1">
                {combo}x KOMBO
              </span>
            )}
          </div>
        )}

        <button
          onPointerDown={(e) => {
            e.stopPropagation();
            setMuted((prev) => !prev);
          }}
          className="pointer-events-auto bg-slate-900/70 backdrop-blur-md border border-cyan-500/30 p-3 rounded-2xl text-cyan-300 active:scale-95 transition"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {gameState === 'START' && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/65 backdrop-blur-sm p-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-bold tracking-widest uppercase mb-4">
            <Zap className="w-3.5 h-3.5 text-yellow-400" /> MCF GAMES • OYUN 1
          </div>
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-yellow-300 mb-3 tracking-tight">
            NEON ORBIT
          </h1>
          <p className="text-slate-300 max-w-xs text-sm mb-8 leading-relaxed">
            Ekrana dokunarak iç ve dış yörünge arasında geçiş yap. Turuncu engellerden kaç, altın küreleri topla!
          </p>
          <button
            onClick={startGame}
            className="flex items-center gap-3 bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-black text-lg px-9 py-4 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.5)] active:scale-95 transition cursor-pointer"
          >
            <Play className="w-6 h-6 fill-slate-950" /> OYUNA BAŞLA
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-md p-6 text-center"
        >
          <h2 className="text-4xl font-black text-orange-400 mb-2 tracking-wide">
            ÇARPIŞMA!
          </h2>
          <p className="text-slate-400 text-sm mb-6">Yörünge stabilitesi bozuldu</p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs mb-8">
            <div className="bg-slate-900/90 border border-cyan-500/30 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 uppercase font-bold mb-1">SKOR</div>
              <div className="text-3xl font-black text-cyan-400">{score}</div>
            </div>
            <div className="bg-slate-900/90 border border-yellow-500/30 p-4 rounded-2xl">
              <div className="text-xs text-slate-400 uppercase font-bold mb-1">EN İYİ</div>
              <div className="text-3xl font-black text-yellow-400">{highScore}</div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-yellow-400 text-slate-950 font-black text-lg px-9 py-4 rounded-2xl shadow-[0_0_30px_rgba(251,146,60,0.5)] active:scale-95 transition cursor-pointer"
          >
            <RotateCcw className="w-6 h-6" /> TEKRAR OYNA
          </button>
        </div>
      )}
    </div>
  );
}