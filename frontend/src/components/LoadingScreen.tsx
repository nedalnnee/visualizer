import { useState, useEffect, useRef, useMemo } from 'react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  estimatedSteps?: string[];
}

const FUN_MESSAGES = [
  'Summoning nikic/php-parser from the AST realm…',
  'Tracing $this->magicMethod() across the multiverse…',
  'Hunting down rogue circular dependencies…',
  'PHPStan is critically analyzing method calls…',
  'Untangling spaghetti code with Dagre graph layout…',
  'Asking the codebase politely to organize itself…',
  'Checking for stray semicolons in the matrix…',
  'Translating PHP class hierarchies into interactive nodes…',
  'Brewing fresh coffee for the AST visitor…',
  'Optimizing visual physics and node magnets…',
  'Locating unreachable dead code islands…',
  'Connecting static method call bridges…',
];

const PHP_JOKES = [
  'Why do PHP developers wear glasses? Because they don’t C#.',
  'PHP: Incomplete list of things that are true: true, 1, "0.0", and your love for visualizers.',
  'There are 10 types of PHP programmers: those who understand dynamic typing, and those who get "Array to string conversion".',
  'A query walks into a bar, joins two tables, and asks: "Is this relation one-to-many?"',
  'Composer install completed with 0 errors... just kidding, checking dependencies.',
  'Did you know? The first version of PHP was called "Personal Home Page Tools" back in 1994!',
];

interface FloatingNode {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  type: 'class' | 'method' | 'bug' | 'dead';
  color: string;
  size: number;
  squashed?: boolean;
}

// Simple Web Audio sound synthesizer (zero external audio file dependencies)
function playPopSound(pitch: number = 440) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.13);
  } catch {
    // Ignore audio errors if blocked by browser policy
  }
}

export function LoadingScreen({
  title = 'Loading Project Graph…',
  subtitle = 'Parsing AST, resolving method calls, and calculating layout',
  estimatedSteps = [
    'Scanning PHP directory files',
    'Building Abstract Syntax Tree (AST)',
    'Extracting CallGraph & Class Hierarchy',
    'Running Dead Code & Syntax Analysis',
    'Applying Dagre Force Layout',
  ],
}: LoadingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [jokeIndex, setJokeIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [clickSparks, setClickSparks] = useState<{ id: number; x: number; y: number; text: string }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<FloatingNode[]>([]);
  const sparkIdCounter = useRef(0);

  // Rotating status message
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % FUN_MESSAGES.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // Step progress animation
  useEffect(() => {
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => (prev < estimatedSteps.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(stepTimer);
  }, [estimatedSteps.length]);

  // Initialize interactive floating nodes
  const initialNodes = useMemo(() => {
    const labels = [
      { label: 'UserController', type: 'class' as const, color: '#3b82f6' },
      { label: 'AuthService::login()', type: 'method' as const, color: '#10b981' },
      { label: '🐛 Missing ;', type: 'bug' as const, color: '#ef4444' },
      { label: 'TokenRepository', type: 'class' as const, color: '#8b5cf6' },
      { label: '⚡ deadCode()', type: 'dead' as const, color: '#f59e0b' },
      { label: 'Database::query()', type: 'method' as const, color: '#06b6d4' },
      { label: '🐛 UndefinedVar', type: 'bug' as const, color: '#ec4899' },
      { label: 'EventDispatcher', type: 'class' as const, color: '#6366f1' },
      { label: 'Response::json()', type: 'method' as const, color: '#14b8a6' },
    ];

    return labels.map((item, i) => ({
      id: i + 1,
      x: 100 + (i * 90) % 600,
      y: 80 + ((i * 70) % 300),
      vx: (Math.random() - 0.5) * 1.6,
      vy: (Math.random() - 0.5) * 1.6,
      label: item.label,
      type: item.type,
      color: item.color,
      size: item.type === 'bug' ? 24 : 32,
    }));
  }, []);

  useEffect(() => {
    nodesRef.current = initialNodes;
  }, [initialNodes]);

  // Interactive Canvas Simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const width = canvas.width || 800;
      const height = canvas.height || 400;

      // Draw connection lines between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.35;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Update and draw nodes
      nodes.forEach((node) => {
        // Move
        node.x += node.vx;
        node.y += node.vy;

        // Bounce on edges
        if (node.x < 40) {
          node.x = 40;
          node.vx *= -1;
        }
        if (node.x > width - 40) {
          node.x = width - 40;
          node.vx *= -1;
        }
        if (node.y < 30) {
          node.y = 30;
          node.vy *= -1;
        }
        if (node.y > height - 30) {
          node.y = height - 30;
          node.vy *= -1;
        }

        // Draw node capsule / circle
        ctx.save();
        ctx.beginPath();

        // Node card background
        ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        const textWidth = ctx.measureText(node.label).width;
        const boxWidth = Math.max(textWidth + 24, 70);
        const boxHeight = 28;
        const radius = 6;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;

        // Rounded rect
        const x = node.x - boxWidth / 2;
        const y = node.y - boxHeight / 2;
        ctx.roundRect(x, y, boxWidth, boxHeight, radius);
        ctx.fill();

        // Border colored by type
        ctx.strokeStyle = node.color;
        ctx.lineWidth = node.type === 'bug' ? 2 : 1.5;
        if (node.type === 'dead') {
          ctx.setLineDash([3, 2]);
        }
        ctx.stroke();

        // Text label
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y);

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Handle clicking on nodes or canvas to squash bugs / spawn nodes
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let hit = false;
    nodesRef.current.forEach((node) => {
      const dx = node.x - clickX;
      const dy = node.y - clickY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 40) {
        hit = true;
        const isBug = node.type === 'bug';
        const points = isBug ? 250 : 100;
        const newCombo = combo + 1;
        setCombo(newCombo);
        setScore((prev) => prev + points * newCombo);

        if (soundEnabled) {
          playPopSound(isBug ? 650 : 440 + newCombo * 30);
        }

        // Add spark text
        const sparkId = ++sparkIdCounter.current;
        setClickSparks((prev) => [
          ...prev,
          {
            id: sparkId,
            x: clickX,
            y: clickY,
            text: isBug ? `🐛 SQUASHED! +${points * newCombo}` : `⚡ RESOLVED! +${points * newCombo}`,
          },
        ]);

        // Kick the node in a fun direction
        node.vx = (Math.random() - 0.5) * 6;
        node.vy = (Math.random() - 0.5) * 6;

        if (isBug) {
          node.label = '✓ Fixed';
          node.color = '#10b981';
          node.type = 'method';
        }
      }
    });

    // If clicked empty space, spawn a small energetic sub-node
    if (!hit) {
      if (soundEnabled) playPopSound(320);
      const sparkId = ++sparkIdCounter.current;
      setClickSparks((prev) => [
        ...prev,
        { id: sparkId, x: clickX, y: clickY, text: '+1 Node' },
      ]);

      const newNode: FloatingNode = {
        id: Date.now(),
        x: clickX,
        y: clickY,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        label: `fn_${Math.floor(Math.random() * 900 + 100)}()`,
        type: 'method',
        color: '#6366f1',
        size: 28,
      };
      nodesRef.current = [...nodesRef.current.slice(-15), newNode];
    }

    // Auto-remove spark after 900ms
    setTimeout(() => {
      setClickSparks((prev) => prev.filter((s) => s.id !== sparkIdCounter.current - 4));
    }, 900);
  };

  const nextJoke = () => {
    setJokeIndex((prev) => (prev + 1) % PHP_JOKES.length);
    if (soundEnabled) playPopSound(520);
  };

  return (
    <div className="relative flex min-h-screen w-screen flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-slate-50 via-gray-50 to-slate-100 p-6 text-slate-800 select-none">
      {/* Top Header / Status bar */}
      <header className="flex w-full max-w-4xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold shadow-md shadow-slate-900/10">
            <span className="text-sm tracking-tighter">PHP</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>

        {/* Mini Game Stats & Audio Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
            <span>🎯 AST Energy:</span>
            <span className="font-bold text-blue-600">{score.toLocaleString()}</span>
            {combo > 1 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-700">
                {combo}x Combo!
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playPopSound(500);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            title={soundEnabled ? 'Mute sound effects' : 'Enable playful sound effects'}
          >
            {soundEnabled ? '🔊' : '🔈'}
          </button>
        </div>
      </header>

      {/* Main Interactive Floating DAG Canvas */}
      <div className="relative my-4 flex h-[340px] w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/70 p-2 shadow-xl shadow-slate-200/50 backdrop-blur-md">
        {/* Canvas overlay note */}
        <div className="pointer-events-none absolute top-3 left-4 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-blue-500" />
          <span>Interactive Sandbox: Click any node or bug to resolve while waiting!</span>
        </div>

        {/* Interactive HTML5 Canvas */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="h-full w-full cursor-pointer rounded-xl"
        />

        {/* Floating Sparks / Popups */}
        {clickSparks.map((spark) => (
          <div
            key={spark.id}
            style={{ left: spark.x, top: spark.y }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full animate-bounce text-xs font-bold text-blue-600 drop-shadow-sm transition-all"
          >
            {spark.text}
          </div>
        ))}

        {/* Central Pulse Indicator */}
        <div className="pointer-events-none absolute flex flex-col items-center justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
            <svg
              className="h-7 w-7 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-700 transition-all duration-300">
            {FUN_MESSAGES[messageIndex]}
          </p>
        </div>
      </div>

      {/* Bottom Section: Progress Stepper & Fun Joke Ticker */}
      <footer className="w-full max-w-4xl space-y-4">
        {/* Visual Progress Stepper */}
        <div className="rounded-xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700">Extraction Pipeline</span>
            <span>
              Step {currentStep + 1} of {estimatedSteps.length}
            </span>
          </div>

          {/* Stepper bar */}
          <div className="grid grid-cols-5 gap-2">
            {estimatedSteps.map((step, idx) => {
              const isDone = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <div key={step} className="group flex flex-col gap-1">
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-500 ${
                      isDone
                        ? 'bg-emerald-500'
                        : isCurrent
                          ? 'animate-pulse bg-blue-600'
                          : 'bg-slate-200'
                    }`}
                  />
                  <span
                    className={`truncate text-[10px] ${
                      isCurrent
                        ? 'font-bold text-blue-600'
                        : isDone
                          ? 'text-slate-600'
                          : 'text-slate-400'
                    }`}
                    title={step}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fun PHP Joke / Trivia Card */}
        <div className="flex items-center justify-between rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-xs text-amber-900 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2.5">
            <span className="text-base">💡</span>
            <p className="font-medium italic">"{PHP_JOKES[jokeIndex]}"</p>
          </div>
          <button
            type="button"
            onClick={nextJoke}
            className="ml-3 shrink-0 rounded-lg border border-amber-300/80 bg-amber-100/80 px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-200 hover:text-amber-950"
          >
            Another Joke ➔
          </button>
        </div>
      </footer>
    </div>
  );
}
