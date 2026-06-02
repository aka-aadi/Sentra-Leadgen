"use client";

import { useEffect, useRef } from "react";

export function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    // Create a galaxy-like distribution of particles
    const particles = Array.from({ length: 400 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * Math.max(w, h) * 0.8;
      return {
        angle,
        radius,
        size: Math.random() * 2.5 + 0.5,
        speed: (Math.random() * 0.002) + 0.0005,
        opacity: Math.random() * 0.8 + 0.2,
        color: Math.random() > 0.5 ? "99, 102, 241" : "139, 92, 246", // indigo to violet
      };
    });

    let animationId: number;
    let time = 0;

    const render = () => {
      time += 1;
      
      const isDark = document.documentElement.classList.contains('dark');
      
      // Deep dark background or crisp white
      ctx.fillStyle = isDark ? "#020617" : "#ffffff";
      ctx.fillRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2;

      particles.forEach((p, i) => {
        // Slowly rotate around center
        p.angle += p.speed;
        
        // Add some subtle waving to radius
        const currentRadius = p.radius + Math.sin(time * 0.01 + i) * 20;

        const x = centerX + Math.cos(p.angle) * currentRadius;
        const y = centerY + Math.sin(p.angle) * currentRadius * 0.5; // Squish y for 3D perspective effect

        // Only draw if on screen
        if (x > 0 && x < w && y > 0 && y < h) {
          ctx.beginPath();
          ctx.arc(x, y, p.size, 0, Math.PI * 2);
          
          // Flicker effect
          const flicker = Math.sin(time * 0.05 + i) * 0.3 + 0.7;
          
          // In light mode, particles should be slightly darker to contrast against white
          const opacityMult = isDark ? 1 : 1.2;
          ctx.fillStyle = `rgba(${p.color}, ${Math.min(1, p.opacity * flicker * opacityMult)})`;
          
          // Glow
          ctx.shadowBlur = isDark ? 10 : 5;
          ctx.shadowColor = `rgba(${p.color}, ${isDark ? 0.8 : 0.4})`;
          
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 bg-background transition-colors duration-500" />;
}
