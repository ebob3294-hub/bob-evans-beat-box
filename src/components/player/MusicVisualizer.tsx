import { useEffect, useRef } from 'react';

interface Props {
  isPlaying: boolean;
  bars?: number;
  className?: string;
}

/**
 * Frequency-bar music visualizer driven by the global AnalyserNode
 * exposed on window.__bobEvanAnalyser by useAudioPlayer.
 *
 * Falls back to a gentle idle animation when no analyser/audio data
 * is available so the UI never looks dead.
 */
const MusicVisualizer = ({ isPlaying, bars = 48, className = '' }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize to actual pixel size
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let dataArray: Uint8Array<ArrayBuffer> | null = null;
    let phase = 0;

    const getPrimary = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim();
      return v || '0 85% 50%';
    };

    const draw = () => {
      const analyser = (window as any).__bobEvanAnalyser as AnalyserNode | undefined;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const primary = getPrimary();
      const gap = 2;
      const barWidth = (w - gap * (bars - 1)) / bars;

      let values: number[] = [];

      if (analyser && isPlaying) {
        if (!dataArray || dataArray.length !== analyser.frequencyBinCount) {
          dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        }
        analyser.getByteFrequencyData(dataArray as unknown as Uint8Array);
        // Sample from low-mids to highs (skip the very bottom DC bins)
        const start = 2;
        const end = Math.min(dataArray.length, 320);
        const step = (end - start) / bars;
        for (let i = 0; i < bars; i++) {
          const from = Math.floor(start + i * step);
          const to = Math.floor(start + (i + 1) * step);
          let sum = 0;
          for (let j = from; j < to; j++) sum += dataArray[j];
          const avg = sum / Math.max(1, to - from);
          values.push(avg / 255);
        }
      } else {
        // Idle gentle wave
        phase += 0.04;
        for (let i = 0; i < bars; i++) {
          const v =
            0.18 +
            Math.sin(phase + i * 0.35) * 0.08 +
            Math.sin(phase * 0.6 + i * 0.15) * 0.06;
          values.push(Math.max(0.05, v));
        }
      }

      for (let i = 0; i < bars; i++) {
        const v = values[i];
        const barH = Math.max(2, v * h);
        const x = i * (barWidth + gap);
        const y = (h - barH) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, `hsl(${primary} / 0.95)`);
        grad.addColorStop(1, `hsl(${primary} / 0.35)`);
        ctx.fillStyle = grad;

        const r = Math.min(barWidth / 2, 3);
        // Rounded rect
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barWidth - r, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r);
        ctx.lineTo(x + barWidth, y + barH - r);
        ctx.quadraticCurveTo(x + barWidth, y + barH, x + barWidth - r, y + barH);
        ctx.lineTo(x + r, y + barH);
        ctx.quadraticCurveTo(x, y + barH, x, y + barH - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [bars, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
};

export default MusicVisualizer;
