"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

const AnimatedBackground = () => {
  const [mounted, setMounted] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Parallax transforms - increased range for more noticeable movement
  const layer1X = useTransform(smoothX, [0, 1], ["-8%", "8%"]);
  const layer1Y = useTransform(smoothY, [0, 1], ["-5%", "5%"]);
  const layer2X = useTransform(smoothX, [0, 1], ["10%", "-10%"]);
  const layer2Y = useTransform(smoothY, [0, 1], ["6%", "-6%"]);
  const layer3X = useTransform(smoothX, [0, 1], ["-6%", "6%"]);
  const layer3Y = useTransform(smoothY, [0, 1], ["-8%", "8%"]);
  const layer4X = useTransform(smoothX, [0, 1], ["4%", "-4%"]);
  const layer4Y = useTransform(smoothY, [0, 1], ["-3%", "3%"]);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient - richer colors */}
      <div className="absolute inset-0 bg-linear-to-b from-stone-100 via-amber-50/50 to-orange-50/40 dark:from-stone-950 dark:via-stone-900 dark:to-neutral-900 transition-colors duration-1000" />
      
      {/* Noise texture overlay - more visible */}
      <div 
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Organic shape 1 - Top left warm accent - larger and more vivid */}
      <motion.div
        className="absolute -top-[15%] -left-[5%] h-[80vh] w-[70vw]"
        style={{ x: layer1X, y: layer1Y }}
      >
        <motion.div
          className="h-full w-full rounded-[40%_60%_70%_30%/30%_30%_70%_70%] bg-linear-to-br from-amber-300/60 via-orange-200/50 to-yellow-100/30 blur-[60px] dark:from-amber-800/35 dark:via-orange-900/30 dark:to-yellow-900/20"
          animate={{
            borderRadius: [
              "40% 60% 70% 30%/30% 30% 70% 70%",
              "60% 40% 30% 70%/60% 30% 70% 40%",
              "50% 50% 60% 40%/40% 60% 40% 60%",
              "40% 60% 70% 30%/30% 30% 70% 70%",
            ],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Organic shape 2 - Center right cool accent - more prominent */}
      <motion.div
        className="absolute top-[5%] -right-[10%] h-[85vh] w-[55vw]"
        style={{ x: layer2X, y: layer2Y }}
      >
        <motion.div
          className="h-full w-full rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-linear-to-bl from-slate-400/35 via-zinc-300/30 to-stone-200/25 blur-[70px] dark:from-slate-600/30 dark:via-zinc-700/25 dark:to-stone-800/20"
          animate={{
            borderRadius: [
              "60% 40% 30% 70%/60% 30% 70% 40%",
              "30% 60% 70% 40%/50% 60% 30% 60%",
              "45% 55% 50% 50%/55% 45% 55% 45%",
              "60% 40% 30% 70%/60% 30% 70% 40%",
            ],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Organic shape 3 - Bottom accent - warmer and larger */}
      <motion.div
        className="absolute -bottom-[20%] left-[15%] h-[70vh] w-[75vw]"
        style={{ x: layer3X, y: layer3Y }}
      >
        <motion.div
          className="h-full w-full rounded-[30%_70%_70%_30%/30%_52%_48%_70%] bg-linear-to-t from-rose-200/40 via-amber-200/35 to-orange-100/25 blur-[70px] dark:from-rose-900/30 dark:via-amber-900/25 dark:to-orange-950/20"
          animate={{
            borderRadius: [
              "30% 70% 70% 30%/30% 52% 48% 70%",
              "50% 50% 30% 70%/45% 70% 30% 55%",
              "40% 60% 55% 45%/35% 65% 45% 55%",
              "30% 70% 70% 30%/30% 52% 48% 70%",
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
      </motion.div>

      {/* NEW: Additional accent shape - top right warm glow */}
      <motion.div
        className="absolute -top-[10%] right-[20%] h-[50vh] w-[40vw]"
        style={{ x: layer4X, y: layer4Y }}
      >
        <motion.div
          className="h-full w-full rounded-[50%_50%_40%_60%/60%_40%_60%_40%] bg-linear-to-bl from-orange-200/45 via-amber-100/35 to-transparent blur-[50px] dark:from-orange-800/25 dark:via-amber-900/20"
          animate={{
            borderRadius: [
              "50% 50% 40% 60%/60% 40% 60% 40%",
              "40% 60% 50% 50%/50% 50% 50% 50%",
              "50% 50% 40% 60%/60% 40% 60% 40%",
            ],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </motion.div>

      {/* Floating orbs - with proper parallax/animation separation */}
      {/* Orb 1: Parallax wrapper + inner float animation */}
      <motion.div
        className="absolute top-[55%] left-[8%] h-48 w-48"
        style={{ x: layer4X, y: layer4Y }}
      >
        <motion.div
          className="h-full w-full rounded-full bg-linear-to-br from-amber-400/50 to-orange-300/40 blur-2xl dark:from-amber-500/30 dark:to-orange-600/25"
          animate={{
            y: [0, -50, 0],
            x: [0, 25, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Orb 2: Parallax wrapper + inner float animation */}
      <motion.div
        className="absolute top-[15%] right-[20%] h-36 w-36"
        style={{ x: layer3X, y: layer3Y }}
      >
        <motion.div
          className="h-full w-full rounded-full bg-linear-to-br from-slate-400/45 to-zinc-300/35 blur-xl dark:from-slate-500/30 dark:to-zinc-600/25"
          animate={{
            y: [0, 35, 0],
            x: [0, -20, 0],
            scale: [1, 0.85, 1],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </motion.div>

      {/* Orb 3: Bottom right - Parallax wrapper + inner float animation */}
      <motion.div
        className="absolute top-[70%] right-[15%] h-40 w-40"
        style={{ x: layer2X, y: layer2Y }}
      >
        <motion.div
          className="h-full w-full rounded-full bg-linear-to-tl from-rose-300/45 to-pink-200/35 blur-2xl dark:from-rose-600/25 dark:to-pink-700/20"
          animate={{
            y: [0, -40, 0],
            x: [0, -30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3,
          }}
        />
      </motion.div>

      {/* Orb 4: Center left - Parallax wrapper + inner float animation */}
      <motion.div
        className="absolute top-[40%] left-[25%] h-24 w-24"
        style={{ x: layer1X, y: layer1Y }}
      >
        <motion.div
          className="h-full w-full rounded-full bg-linear-to-br from-yellow-300/40 to-amber-200/30 blur-xl dark:from-yellow-500/20 dark:to-amber-600/15"
          animate={{
            y: [0, 20, -15, 0],
            x: [0, -15, 10, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
          }}
        />
      </motion.div>

      {/* Grid pattern - more visible */}
      <div 
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(rgba(120,113,108,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(120,113,108,0.3) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Diagonal accent lines */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            rgba(180,160,140,0.3) 100px,
            rgba(180,160,140,0.3) 101px
          )`,
        }}
      />

      {/* Vignette effect - stronger */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_0%,rgba(0,0,0,0.08)_100%)] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_0%,rgba(0,0,0,0.25)_100%)]" />

      {/* Edge gradient - draws eye to center */}
      <div className="absolute inset-0 bg-linear-to-r from-stone-100/30 via-transparent to-stone-100/30 dark:from-stone-950/40 dark:via-transparent dark:to-stone-950/40" />
    </div>
  );
};

export default AnimatedBackground;
