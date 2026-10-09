import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  shape: "petal" | "circle" | "confetti";
  opacity: number;
}

const COLORS = [
  "hsl(340, 82%, 65%)", // pink
  "hsl(320, 70%, 60%)", // magenta
  "hsl(45, 93%, 60%)",  // golden yellow
  "hsl(150, 60%, 50%)", // green
  "hsl(270, 60%, 65%)", // purple
  "hsl(25, 90%, 60%)",  // orange
  "hsl(200, 70%, 60%)", // sky blue
  "hsl(0, 80%, 65%)",   // red
];

export default function CelebrationConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      size: Math.random() * 10 + 5,
      speedY: Math.random() * 3 + 1.5,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: (["petal", "circle", "confetti"] as const)[Math.floor(Math.random() * 3)],
      opacity: 1,
    }));

    let frame: number;
    let elapsed = 0;
    const duration = 4000;
    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      elapsed += dt;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const fadeOut = elapsed > duration * 0.6 ? 1 - (elapsed - duration * 0.6) / (duration * 0.4) : 1;

      for (const p of particles) {
        p.y += p.speedY;
        p.x += p.speedX + Math.sin(p.rotation) * 0.5;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, fadeOut);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.opacity;

        if (p.shape === "petal") {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 0.4, p.size, 0, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }

        ctx.restore();
      }

      if (elapsed < duration) {
        frame = requestAnimationFrame(draw);
      }
    };

    frame = requestAnimationFrame(draw);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
    />
  );
}
