import { useEffect, useRef, useMemo } from 'react';
import { useLowMotion } from '@/hooks/useLowMotion';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ParticleBackgroundProps {
  particleCount?: number;
  className?: string;
}

const isMobile = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(max-width: 768px)').matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

export const ParticleBackground = ({
  particleCount = 60,
  className = '',
}: ParticleBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const { lowMotion } = useLowMotion();

  // Mobile / low-motion: drastically fewer particles
  const effectiveCount = useMemo(() => {
    if (lowMotion) return 0;
    if (isMobile()) return Math.min(18, Math.round(particleCount / 3));
    return particleCount;
  }, [particleCount, lowMotion]);

  const generateParticles = useMemo(() => {
    return (width: number, height: number): Particle[] => {
      const particles: Particle[] = [];
      for (let i = 0; i < effectiveCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 2.5 + 0.5,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.7 + 0.3,
          twinkleSpeed: Math.random() * 0.02 + 0.01,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }
      return particles;
    };
  }, [effectiveCount]);

  useEffect(() => {
    if (effectiveCount === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const mobile = isMobile();
    const targetFps = mobile ? 24 : 60;
    const frameInterval = 1000 / targetFps;
    const useGlow = !mobile; // radial gradients per particle are expensive on mobile

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // reset before scaling to avoid compounding
      particlesRef.current = generateParticles(rect.width, rect.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let time = 0;
    let lastFrame = 0;
    let paused = document.hidden;

    const onVisibility = () => {
      paused = document.hidden;
      if (!paused) {
        lastFrame = 0;
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const animate = (now: number = performance.now()) => {
      if (paused) return;
      if (now - lastFrame < frameInterval) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrame = now;

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (const particle of particlesRef.current) {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        if (particle.x < 0) particle.x = rect.width;
        if (particle.x > rect.width) particle.x = 0;
        if (particle.y < 0) particle.y = rect.height;
        if (particle.y > rect.height) particle.y = 0;

        const twinkle =
          Math.sin(time * particle.twinkleSpeed + particle.twinklePhase) * 0.4 + 0.6;
        const currentOpacity = particle.opacity * twinkle;

        if (useGlow) {
          const gradient = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.size * 3
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity})`);
          gradient.addColorStop(0.4, `rgba(255, 220, 150, ${currentOpacity * 0.5})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.fill();
      }

      time++;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', onVisibility);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [generateParticles, effectiveCount]);

  if (effectiveCount === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%', zIndex: 5 }}
    />
  );
};

export default ParticleBackground;
