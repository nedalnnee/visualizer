import { useState, useEffect, useRef, useCallback } from 'react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  estimatedSteps?: string[];
  onCancel?: () => void;
}

// Sound effects generator via Web Audio API (zero external assets)
class RetroAudio {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playLaser() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  playCollect() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.06); // A5
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  playExplode() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.21);
  }

  playPowerUp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = this.ctx.currentTime + i * 0.05;
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    });
  }
}

const audio = new RetroAudio();

const DEV_MEMES = [
  '🐘 The ElePHPant is organizing class nodes into neat boxes…',
  '🔍 Searching for missing Paamayim Nekudotayim (::)…',
  '☕ PHP 8.4 JIT compiler is warming up the AST…',
  '⚡ Resolving cyclic dependencies before the universe collapses…',
  '🛡️ PHPStan is inspecting every method call with strict typing…',
  '✨ Converting thousands of lines into a crystal clear DAG…',
  '🚀 Dagre layout engine calculating node vectors and gravity…',
  '🪄 Turning spaghetti PHP into an interactive galaxy…',
];

const PHP_TRIVIA = [
  '💡 Paamayim Nekudotayim (פעמיים נקודתיים) means "twice colon" in Hebrew (::)!',
  '💡 PHP was originally named "Personal Home Page Tools" when Rasmus Lerdorf created it in 1994.',
  '💡 Over 75% of the top 10 million websites still rely on PHP in some form!',
  '💡 Nikic (Nikita Popov) rewrote the PHP compiler AST in PHP 7 and created the nikic/php-parser library we use!',
  '💡 PHP 8.0 introduced JIT (Just-In-Time) compilation and Union Types.',
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  text?: string;
}

interface TargetEntity {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'bug' | 'token' | 'class';
  label: string;
  hp: number;
  maxHp: number;
  points: number;
  radius: number;
  color: string;
}

interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function LoadingScreen({
  title = 'Analyzing PHP Codebase…',
  subtitle = 'Building AST, resolving class hierarchy, and running static graph extraction',
  estimatedSteps = [
    'Scanning PHP Files & Namespaces',
    'Generating Nikic AST Nodes',
    'Extracting CallGraph & Class Hierarchy',
    'Detecting Dead Code & Parse Errors',
    'Running Dagre Force Layout Engine',
  ],
  onCancel,
}: LoadingScreenProps) {
  // Mode: 'game' (ElePHPant Defender) or 'zen' (Constellation Galaxy)
  const [activeTab, setActiveTab] = useState<'game' | 'zen' | 'terminal'>('game');
  const [sound, setSound] = useState(true);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('php_visualizer_hs') || 0);
    } catch {
      return 0;
    }
  });
  const [combo, setCombo] = useState(1);
  const [memeIdx, setMemeIdx] = useState(0);
  const [triviaIdx, setTriviaIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(1);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[0.001s] Initializing PHP AST extractor...',
    '[0.015s] Registered visitors: CallGraphVisitor, DeadCodeAnalyzer',
    '[0.032s] Loading symbol table and class declarations...',
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef({ x: 400, y: 220, targetX: 400, targetY: 220, angle: 0 });
  const targetsRef = useRef<TargetEntity[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextTargetId = useRef(1);

  // Sync sound preference
  useEffect(() => {
    audio.enabled = sound;
  }, [sound]);

  // Rotate fun memes and progress steps
  useEffect(() => {
    const memeTimer = setInterval(() => {
      setMemeIdx((prev) => (prev + 1) % DEV_MEMES.length);
    }, 2800);

    const stepTimer = setInterval(() => {
      setStepIdx((prev) => {
        const next = prev < estimatedSteps.length - 1 ? prev + 1 : prev;
        setTerminalLogs((logs) => [
          ...logs.slice(-8),
          `[${(Math.random() * 0.4 + 0.1).toFixed(3)}s] ${estimatedSteps[next]} - Complete ✓`,
        ]);
        return next;
      });
    }, 2200);

    return () => {
      clearInterval(memeTimer);
      clearInterval(stepTimer);
    };
  }, [estimatedSteps]);

  // Spawn game entities
  const spawnTarget = useCallback((w: number, h: number) => {
    const types: ('bug' | 'token' | 'class')[] = ['bug', 'token', 'class', 'bug'];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = nextTargetId.current++;

    let label = ';';
    let color = '#3b82f6';
    let hp = 1;
    let points = 100;
    let radius = 22;

    if (type === 'bug') {
      const bugs = ['🐛 SyntaxError', '🐛 UndefinedFn', '🐛 Missing ;', '🐛 $this->null'];
      label = bugs[Math.floor(Math.random() * bugs.length)];
      color = '#ef4444';
      hp = 2;
      points = 250;
      radius = 28;
    } else if (type === 'token') {
      const tokens = ['<?php', '::class', '->dispatch()', '$this->call()', 'fn() =>', 'namespace'];
      label = tokens[Math.floor(Math.random() * tokens.length)];
      color = '#10b981';
      hp = 1;
      points = 150;
      radius = 24;
    } else {
      const classes = ['UserController', 'AuthService', 'DagreLayout', 'CallGraph'];
      label = classes[Math.floor(Math.random() * classes.length)];
      color = '#8b5cf6';
      hp = 1;
      points = 200;
      radius = 30;
    }

    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = Math.random() * w;
      y = -30;
    } else if (side === 1) {
      x = w + 30;
      y = Math.random() * h;
    } else if (side === 2) {
      x = Math.random() * w;
      y = h + 30;
    } else {
      x = -30;
      y = Math.random() * h;
    }

    // Velocity towards center
    const targetX = w / 2 + (Math.random() - 0.5) * 200;
    const targetY = h / 2 + (Math.random() - 0.5) * 150;
    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = 0.8 + Math.random() * 1.2;

    targetsRef.current.push({
      id,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      type,
      label,
      hp,
      maxHp: hp,
      points,
      radius,
      color,
    });
  }, []);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastSpawn = 0;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (timestamp: number) => {
      if (!canvas || !ctx) return;
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw subtle digital background grid
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.lineWidth = 1;
      const gridSize = 32;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 2. Spawn entities if needed
      if (timestamp - lastSpawn > 1100 && targetsRef.current.length < 8) {
        spawnTarget(w, h);
        lastSpawn = timestamp;
      }

      // 3. Smooth Player (ElePHPant ship) tracking towards mouse
      const player = playerRef.current;
      player.x += (player.targetX - player.x) * 0.12;
      player.y += (player.targetY - player.y) * 0.12;
      player.angle = Math.atan2(player.targetY - player.y, player.targetX - player.x);

      // 4. Update & Draw Lasers
      for (let i = lasersRef.current.length - 1; i >= 0; i--) {
        const laser = lasersRef.current[i];
        laser.x += laser.vx;
        laser.y += laser.vy;

        // Draw laser beam
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(laser.x - laser.vx * 0.8, laser.y - laser.vy * 0.8);
        ctx.lineTo(laser.x, laser.y);
        ctx.stroke();
        ctx.restore();

        // Check collision with targets
        for (let j = targetsRef.current.length - 1; j >= 0; j--) {
          const target = targetsRef.current[j];
          const dist = Math.hypot(laser.x - target.x, laser.y - target.y);

          if (dist < target.radius + 6) {
            target.hp -= 1;
            // Spawn hit sparks
            for (let p = 0; p < 5; p++) {
              particlesRef.current.push({
                x: target.x,
                y: target.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: target.color,
                size: Math.random() * 3 + 2,
                alpha: 1,
              });
            }

            // Remove laser
            lasersRef.current.splice(i, 1);

            if (target.hp <= 0) {
              // Target destroyed!
              const earned = target.points * combo;
              setScore((s) => {
                const newScore = s + earned;
                setHighScore((hs) => {
                  if (newScore > hs) {
                    try {
                      localStorage.setItem('php_visualizer_hs', String(newScore));
                    } catch {}
                    return newScore;
                  }
                  return hs;
                });
                return newScore;
              });
              setCombo((c) => Math.min(c + 1, 10));

              if (target.type === 'bug') audio.playExplode();
              else audio.playCollect();

              // Big explosion particle burst
              for (let p = 0; p < 12; p++) {
                particlesRef.current.push({
                  x: target.x,
                  y: target.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  color: target.color,
                  size: Math.random() * 4 + 2,
                  alpha: 1,
                });
              }

              // Text banner spark
              particlesRef.current.push({
                x: target.x,
                y: target.y - 15,
                vx: 0,
                vy: -1.2,
                color: target.color,
                size: 12,
                alpha: 1,
                text: `+${earned}`,
              });

              targetsRef.current.splice(j, 1);
            }
            break;
          }
        }

        // Out of bounds cleanup
        if (laser.x < 0 || laser.x > w || laser.y < 0 || laser.y > h) {
          lasersRef.current.splice(i, 1);
        }
      }

      // 5. Update & Draw Target Entities
      targetsRef.current.forEach((t) => {
        t.x += t.vx;
        t.y += t.vy;

        // Bounce gently inside boundary or wrap
        if (t.x < t.radius) {
          t.x = t.radius;
          t.vx *= -1;
        }
        if (t.x > w - t.radius) {
          t.x = w - t.radius;
          t.vx *= -1;
        }
        if (t.y < t.radius) {
          t.y = t.radius;
          t.vy *= -1;
        }
        if (t.y > h - t.radius) {
          t.y = h - t.radius;
          t.vy *= -1;
        }

        // Draw Target Capsule
        ctx.save();
        ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        const txtWidth = ctx.measureText(t.label).width;
        const boxW = Math.max(txtWidth + 20, 50);
        const boxH = 26;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(15, 23, 42, 0.1)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.roundRect(t.x - boxW / 2, t.y - boxH / 2, boxW, boxH, 8);
        ctx.fill();

        ctx.strokeStyle = t.color;
        ctx.lineWidth = t.hp > 1 ? 2.5 : 1.5;
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.label, t.x, t.y);

        // HP bar if tough
        if (t.maxHp > 1) {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(t.x - 16, t.y + boxH / 2 + 3, 32, 3);
          ctx.fillStyle = t.color;
          ctx.fillRect(t.x - 16, t.y + boxH / 2 + 3, (32 * t.hp) / t.maxHp, 3);
        }

        ctx.restore();
      });

      // 6. Draw Player (ElePHPant Hero)
      ctx.save();
      ctx.translate(player.x, player.y);

      // Pulsing aura ring
      ctx.beginPath();
      ctx.arc(0, 0, 24 + Math.sin(timestamp * 0.006) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // ElePHPant icon & core
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐘', 0, 1);

      ctx.restore();

      // 7. Update & Draw Particles
      for (let p = particlesRef.current.length - 1; p >= 0; p--) {
        const pt = particlesRef.current[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.022;

        if (pt.alpha <= 0) {
          particlesRef.current.splice(p, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = pt.alpha;
        if (pt.text) {
          ctx.font = 'bold 12px ui-monospace, monospace';
          ctx.fillStyle = pt.color;
          ctx.fillText(pt.text, pt.x, pt.y);
        } else {
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, [spawnTarget, combo]);

  // Handle Mouse / Touch Movement
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    playerRef.current.targetX = e.clientX - rect.left;
    playerRef.current.targetY = e.clientY - rect.top;
  };

  // Shoot laser on click / space
  const fireLaser = (targetX?: number, targetY?: number) => {
    const player = playerRef.current;
    const destX = targetX ?? player.targetX;
    const destY = targetY ?? player.targetY;
    const angle = Math.atan2(destY - player.y, destX - player.x) || -Math.PI / 2;
    const speed = 9;

    lasersRef.current.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });

    audio.playLaser();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    fireLaser(clickX, clickY);
  };

  const triggerPowerUp = () => {
    audio.playPowerUp();
    const w = canvasRef.current?.offsetWidth || 600;
    const h = canvasRef.current?.offsetHeight || 300;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      lasersRef.current.push({
        x: playerRef.current.x,
        y: playerRef.current.y,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
      });
    }
    spawnTarget(w, h);
    spawnTarget(w, h);
  };

  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-between overflow-hidden bg-slate-950 p-4 sm:p-6 text-slate-100 select-none">
      {/* Background ambient gradient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-indigo-600/15 blur-[120px]" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex w-full max-w-4xl items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 font-bold text-white shadow-lg shadow-blue-500/20">
            <span className="text-base">🐘</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white tracking-wide">{title}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                Live AST Extraction
              </span>
            </div>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Action controls / Stats */}
        <div className="flex items-center gap-2.5">
          {/* Arcade Score Pill */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs shadow-inner">
            <span className="text-slate-400 font-mono">SCORE:</span>
            <span className="font-mono font-bold text-cyan-400">{score.toLocaleString()}</span>
            {highScore > 0 && (
              <span className="border-l border-slate-700 pl-2 text-[10px] text-slate-400 font-mono">
                HI: {highScore.toLocaleString()}
              </span>
            )}
            {combo > 1 && (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 animate-pulse">
                {combo}x
              </span>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSound(!sound)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
            title={sound ? 'Mute audio FX' : 'Enable 8-bit sound effects'}
          >
            {sound ? '🔊' : '🔇'}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
          )}
        </div>
      </header>

      {/* Center Interactive Sandbox Area */}
      <main className="relative z-10 my-3 flex w-full max-w-4xl flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Navigation Mode Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-2 bg-slate-950/40">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('game')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                activeTab === 'game'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎮 ElePHPant Bug Blaster
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                activeTab === 'terminal'
                  ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📟 Live AST Terminal
            </button>
          </div>

          {activeTab === 'game' && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Move mouse & click to shoot PHP bugs!
              </span>
              <button
                type="button"
                onClick={triggerPowerUp}
                className="rounded-md border border-indigo-500/40 bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-300 hover:bg-indigo-500/30 transition active:scale-95"
              >
                ⚡ Nova Blast
              </button>
            </div>
          )}
        </div>

        {/* Active View Body */}
        {activeTab === 'game' ? (
          <div className="relative h-[340px] w-full cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onClick={handleCanvasClick}
              className="h-full w-full"
            />
            <div className="pointer-events-none absolute bottom-3 left-4 text-[11px] text-slate-400 font-mono">
              STATUS: {DEV_MEMES[memeIdx]}
            </div>
          </div>
        ) : (
          <div className="flex h-[340px] flex-col justify-between p-4 font-mono text-xs text-slate-300 bg-slate-950/80">
            <div className="space-y-1.5 overflow-y-auto">
              <div className="text-emerald-400">=== PHP Code Visualizer CLI v2.0 ===</div>
              {terminalLogs.map((log, i) => (
                <div key={i} className="text-slate-300">
                  <span className="text-blue-400">→</span> {log}
                </div>
              ))}
              <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                <span>▋</span>
                <span>{DEV_MEMES[memeIdx]}</span>
              </div>
            </div>

            <div className="rounded border border-slate-800 bg-slate-900/60 p-2.5 text-[11px] text-slate-400">
              ⚡ <strong className="text-slate-200">Engine Tip:</strong> Dagre auto-layout runs client-side so your graph coordinates adapt smoothly to screen resolution.
            </div>
          </div>
        )}
      </main>

      {/* Bottom Footer: Stepper & Trivia Carousel */}
      <footer className="relative z-10 w-full max-w-4xl space-y-3">
        {/* Pipeline Stepper */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3.5 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">AST Analysis Progress</span>
            <span className="font-mono text-blue-400">
              Phase {stepIdx + 1} / {estimatedSteps.length}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {estimatedSteps.map((step, idx) => {
              const isDone = idx < stepIdx;
              const isCurrent = idx === stepIdx;
              return (
                <div key={step} className="flex flex-col gap-1">
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                      isDone
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                        : isCurrent
                          ? 'animate-pulse bg-blue-500 shadow-sm shadow-blue-500/50'
                          : 'bg-slate-800'
                    }`}
                  />
                  <span
                    className={`truncate text-[10px] font-mono ${
                      isCurrent
                        ? 'font-bold text-blue-400'
                        : isDone
                          ? 'text-slate-400'
                          : 'text-slate-600'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fun PHP Trivia Ticker */}
        <div className="flex items-center justify-between rounded-xl border border-blue-900/40 bg-blue-950/40 px-4 py-2.5 text-xs text-blue-200 backdrop-blur">
          <div className="flex items-center gap-2 truncate">
            <span className="text-sm">✨</span>
            <p className="truncate italic">{PHP_TRIVIA[triviaIdx]}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setTriviaIdx((prev) => (prev + 1) % PHP_TRIVIA.length);
              audio.playCollect();
            }}
            className="ml-3 shrink-0 rounded-lg border border-blue-700/50 bg-blue-800/40 px-2.5 py-1 text-[11px] font-semibold text-blue-300 hover:bg-blue-700/50 hover:text-white transition"
          >
            Next Fact ➔
          </button>
        </div>
      </footer>
    </div>
  );
}
