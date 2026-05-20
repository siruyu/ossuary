"use client";

import { useEffect, useState } from "react";

interface TerminalTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export default function TerminalText({
  text,
  speed = 50,
  onComplete,
  className = "",
}: TerminalTextProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="cursor-terminal" />}
    </span>
  );
}
