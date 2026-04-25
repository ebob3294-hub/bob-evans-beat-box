import { useEffect, useRef } from 'react';
import { usePlayerStore, type VisualizerStyle } from '@/store/playerStore';

interface Props {
  isPlaying: boolean;
  bars?: number;
  className?: string;
  style?: VisualizerStyle; // optional override
}

/**
 * Multi-style music visualizer driven by the global AnalyserNode
 * exposed on window.__bobEvanAnalyser by useAudioPlayer.
 *
 * Supported styles: bars, mirror, wave, circular, dots, blocks, flame, ribbon.
 * Falls back to a gentle idle animation when audio data is unavailable.
 */
const MusicVisualizer = ({ isPlaying, bars = 48, className = '', style }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const storeStyle = usePlayerStore((s) => s.visualizerStyle);
  const activeStyle: VisualizerStyle = style || storeStyle;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    let timeArray: Uint8Array<ArrayBuffer> | null = null;
    let phase = 0;

    const getPrimary = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue('--primary')
        .trim();
      return v || '0 85% 50%';
    };

    const sampleFreq = (count: number): number[] => {
      const analyser = (window as any).__bobEvanAnalyser as AnalyserNode | undefined;
      const out: number[] = [];
      if (analyser && isPlaying) {
        if (!dataArray || dataArray.length !== analyser.frequencyBinCount) {
          dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        }
        (analyser.getByteFrequencyData as any)(dataArray);
        const start = 2;
        const end = Math.min(dataArray.length, 320);
        const step = (end - start) / count;
        for (let i = 0; i < count; i++) {
          const from = Math.floor(start + i * step);
          const to = Math.floor(start + (i + 1) * step);
          let sum = 0;
          for (let j = from; j < to; j++) sum += dataArray[j];
          const avg = sum / Math.max(1, to - from);
          out.push(avg / 255);
        }
      } else {
        phase += 0.04;
        for (let i = 0; i < count; i++) {
          const v =
            0.18 +
            Math.sin(phase + i * 0.35) * 0.08 +
            Math.sin(phase * 0.6 + i * 0.15) * 0.06;
          out.push(Math.max(0.05, v));
        }
      }
      return out;
    };

    const sampleTime = (count: number): number[] => {
      const analyser = (window as any).__bobEvanAnalyser as AnalyserNode | undefined;
      const out: number[] = [];
      if (analyser && isPlaying) {
        if (!timeArray || timeArray.length !== analyser.fftSize) {
          timeArray = new Uint8Array(new ArrayBuffer(analyser.fftSize));
        }
        (analyser.getByteTimeDomainData as any)(timeArray);
        const step = timeArray.length / count;
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(i * step);
          out.push((timeArray[idx] - 128) / 128); // -1..1
        }
      } else {
        phase += 0.05;
        for (let i = 0; i < count; i++) {
          out.push(Math.sin(phase + i * 0.25) * 0.35);
        }
      }
      return out;
    };

    const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.lineTo(x + w - rr, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
      ctx.lineTo(x + w, y + h - rr);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      ctx.lineTo(x + rr, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
      ctx.lineTo(x, y + rr);
      ctx.quadraticCurveTo(x, y, x + rr, y);
      ctx.closePath();
    };

    const drawBars = (w: number, h: number, primary: string) => {
      const gap = 2;
      const barWidth = (w - gap * (bars - 1)) / bars;
      const values = sampleFreq(bars);
      for (let i = 0; i < bars; i++) {
        const v = values[i];
        const barH = Math.max(2, v * h);
        const x = i * (barWidth + gap);
        const y = (h - barH) / 2;
        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, `hsl(${primary} / 0.95)`);
        grad.addColorStop(1, `hsl(${primary} / 0.35)`);
        ctx.fillStyle = grad;
        roundedRect(x, y, barWidth, barH, 3);
        ctx.fill();
      }
    };

    const drawMirror = (w: number, h: number, primary: string) => {
      const gap = 2;
      const barWidth = (w - gap * (bars - 1)) / bars;
      const values = sampleFreq(bars);
      const mid = h / 2;
      for (let i = 0; i < bars; i++) {
        const v = values[i];
        const barH = Math.max(2, v * h * 0.95);
        const x = i * (barWidth + gap);
        // Top
        const gradT = ctx.createLinearGradient(0, mid - barH / 2, 0, mid);
        gradT.addColorStop(0, `hsl(${primary} / 0.95)`);
        gradT.addColorStop(1, `hsl(${primary} / 0.4)`);
        ctx.fillStyle = gradT;
        roundedRect(x, mid - barH / 2, barWidth, barH / 2, 3);
        ctx.fill();
        // Bottom mirrored, dimmer
        const gradB = ctx.createLinearGradient(0, mid, 0, mid + barH / 2);
        gradB.addColorStop(0, `hsl(${primary} / 0.4)`);
        gradB.addColorStop(1, `hsl(${primary} / 0.05)`);
        ctx.fillStyle = gradB;
        roundedRect(x, mid, barWidth, barH / 2, 3);
        ctx.fill();
      }
    };

    const drawWave = (w: number, h: number, primary: string) => {
      const points = Math.max(64, bars * 2);
      const values = sampleTime(points);
      const mid = h / 2;
      ctx.lineWidth = 2;
      ctx.strokeStyle = `hsl(${primary} / 0.95)`;
      ctx.shadowColor = `hsl(${primary} / 0.6)`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const x = (i / (points - 1)) * w;
        const y = mid + values[i] * (h / 2 - 4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Soft fill underneath
      ctx.lineTo(w, mid);
      ctx.lineTo(0, mid);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, 0, 0, h);
      fill.addColorStop(0, `hsl(${primary} / 0.25)`);
      fill.addColorStop(1, `hsl(${primary} / 0)`);
      ctx.fillStyle = fill;
      ctx.fill();
    };

    const drawCircular = (w: number, h: number, primary: string) => {
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) / 2 - 4;
      const count = Math.min(bars, 64);
      const values = sampleFreq(count);
      // Inner ring
      ctx.strokeStyle = `hsl(${primary} / 0.25)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < count; i++) {
        const v = values[i];
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const r1 = radius * 0.5;
        const r2 = r1 + v * radius * 0.5 + 2;
        const x1 = cx + Math.cos(angle) * r1;
        const y1 = cy + Math.sin(angle) * r1;
        const x2 = cx + Math.cos(angle) * r2;
        const y2 = cy + Math.sin(angle) * r2;
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `hsl(${primary} / 0.9)`);
        grad.addColorStop(1, `hsl(${primary} / 0.2)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    const drawDots = (w: number, h: number, primary: string) => {
      const count = bars;
      const values = sampleFreq(count);
      const colW = w / count;
      const dots = 8;
      for (let i = 0; i < count; i++) {
        const v = values[i];
        const filled = Math.round(v * dots);
        for (let d = 0; d < dots; d++) {
          const y = h - (d + 1) * (h / dots) + (h / dots) / 2;
          const x = i * colW + colW / 2;
          const r = Math.max(1.2, colW / 4);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          if (d < filled) {
            ctx.fillStyle = `hsl(${primary} / ${0.4 + (d / dots) * 0.6})`;
          } else {
            ctx.fillStyle = `hsl(${primary} / 0.08)`;
          }
          ctx.fill();
        }
      }
    };

    const drawBlocks = (w: number, h: number, primary: string) => {
      const count = Math.min(bars, 32);
      const values = sampleFreq(count);
      const gap = 3;
      const colW = (w - gap * (count - 1)) / count;
      const blocks = 10;
      const blockH = (h - (blocks - 1) * 2) / blocks;
      for (let i = 0; i < count; i++) {
        const v = values[i];
        const filled = Math.round(v * blocks);
        const x = i * (colW + gap);
        for (let b = 0; b < blocks; b++) {
          const y = h - (b + 1) * (blockH + 2) + 2;
          const intensity = b / blocks;
          if (b < filled) {
            // green->yellow->red gradient feel using primary
            ctx.fillStyle = `hsl(${primary} / ${0.35 + intensity * 0.6})`;
          } else {
            ctx.fillStyle = `hsl(${primary} / 0.06)`;
          }
          roundedRect(x, y, colW, blockH, 1.5);
          ctx.fill();
        }
      }
    };

    const drawFlame = (w: number, h: number, primary: string) => {
      const count = Math.max(bars, 64);
      const values = sampleFreq(count);
      const step = w / (count - 1);
      // Build top curve
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let i = 0; i < count; i++) {
        const v = values[i];
        const x = i * step;
        const y = h - v * h * 1.05;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `hsl(${primary} / 0.95)`);
      g.addColorStop(0.5, `hsl(${primary} / 0.55)`);
      g.addColorStop(1, `hsl(${primary} / 0.05)`);
      ctx.fillStyle = g;
      ctx.shadowColor = `hsl(${primary} / 0.5)`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawRibbon = (w: number, h: number, primary: string) => {
      const points = 96;
      const time = sampleTime(points);
      const freq = sampleFreq(points);
      const mid = h / 2;
      // Two ribbons: time on top, freq mirrored
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `hsl(${primary} / 0.85)`;
      ctx.shadowColor = `hsl(${primary} / 0.5)`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const x = (i / (points - 1)) * w;
        const y = mid - Math.abs(time[i]) * (h / 2) - freq[i] * 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = `hsl(${primary} / 0.55)`;
      ctx.beginPath();
      for (let i = 0; i < points; i++) {
        const x = (i / (points - 1)) * w;
        const y = mid + Math.abs(time[i]) * (h / 2) + freq[i] * 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const primary = getPrimary();

      switch (activeStyle) {
        case 'mirror': drawMirror(w, h, primary); break;
        case 'wave': drawWave(w, h, primary); break;
        case 'circular': drawCircular(w, h, primary); break;
        case 'dots': drawDots(w, h, primary); break;
        case 'blocks': drawBlocks(w, h, primary); break;
        case 'flame': drawFlame(w, h, primary); break;
        case 'ribbon': drawRibbon(w, h, primary); break;
        case 'bars':
        default: drawBars(w, h, primary); break;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [bars, isPlaying, activeStyle]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
};

export default MusicVisualizer;
