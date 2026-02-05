"use client";

import React, { useId, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

interface SparklesCoreProps {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
}

export const SparklesCore = ({
  id,
  className,
  background = "transparent",
  minSize = 0.4,
  maxSize = 1,
  speed = 1,
  particleColor = "#FFF",
  particleDensity = 100,
}: SparklesCoreProps) => {
  const generatedId = useId();
  const sparkleId = id || generatedId;
  const [particles, setParticles] = useState<Particle[]>([]);

  // Generate particles only on client to avoid hydration mismatch
  useEffect(() => {
    setParticles(
      Array.from({ length: particleDensity }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * (maxSize - minSize) + minSize,
        duration: (Math.random() * 2 + 1) / speed,
        delay: Math.random() * 2,
      }))
    );
  }, [particleDensity, minSize, maxSize, speed]);

  return (
    <div
      className={cn("h-full w-full relative overflow-hidden", className)}
      style={{ background }}
    >
      {particles.map((particle) => (
        <motion.span
          key={`${sparkleId}-${particle.id}`}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: particleColor,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

interface SparklesTitleProps {
  children: React.ReactNode;
  className?: string;
  sparklesClassName?: string;
}

export const SparklesTitle = ({
  children,
  className,
  sparklesClassName,
}: SparklesTitleProps) => {
  return (
    <div className={cn("relative inline-block", className)}>
      <div className="absolute inset-0 -z-10">
        <SparklesCore
          className={cn("w-full h-full", sparklesClassName)}
          particleColor="#ffffff"
          particleDensity={50}
          minSize={0.5}
          maxSize={1.5}
        />
      </div>
      {children}
    </div>
  );
};
