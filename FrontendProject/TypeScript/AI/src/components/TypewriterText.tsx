import React, { useEffect, useState } from 'react';

interface TypewriterTextProps {
  text: string;
  onProgress?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  onProgress
}) => {
  const characters = Array.from(text);
  const [visibleCount, setVisibleCount] = useState(0);
  const finished = visibleCount >= characters.length;

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduceMotion || characters.length === 0) {
      setVisibleCount(characters.length);
      return;
    }

    setVisibleCount(0);
    const step = Math.max(1, Math.ceil(characters.length / 180));
    const timer = window.setInterval(() => {
      setVisibleCount(previous => {
        const next = Math.min(characters.length, previous + step);
        if (next >= characters.length) window.clearInterval(timer);
        return next;
      });
      onProgress?.();
    }, 30);

    return () => window.clearInterval(timer);
  }, [characters.length, onProgress, text]);

  return (
    <span className="typewriter-text" aria-label={text}>
      <span aria-hidden="true">{characters.slice(0, visibleCount).join('')}</span>
      {!finished && <i className="typewriter-cursor" aria-hidden="true" />}
    </span>
  );
};
