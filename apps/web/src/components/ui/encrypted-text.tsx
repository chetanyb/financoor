"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EncryptedTextProps {
  text: string;
  className?: string;
  interval?: number;
}

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";

export function EncryptedText({ text, className, interval = 50 }: EncryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    let iteration = 0;
    let intervalId: NodeJS.Timeout | null = null;

    if (isHovering) {
      intervalId = setInterval(() => {
        setDisplayText((prev) =>
          text
            .split("")
            .map((char, index) => {
              if (index < iteration) {
                return text[index];
              }
              if (char === " ") return " ";
              return characters[Math.floor(Math.random() * characters.length)];
            })
            .join("")
        );

        if (iteration >= text.length) {
          if (intervalId) clearInterval(intervalId);
        }

        iteration += 1 / 3;
      }, interval);
    } else {
      setDisplayText(text);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isHovering, text, interval]);

  return (
    <motion.span
      className={cn("font-mono cursor-default", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {displayText}
    </motion.span>
  );
}
