import React, { useEffect } from 'react';
import { avatarService } from '../services/avatar.service';

interface DigitalHumanStageProps {
  subtitle?: string;
  thinking?: boolean;
  transparent?: boolean;
  children?: React.ReactNode;
}

export const DigitalHumanStage: React.FC<DigitalHumanStageProps> = ({
  subtitle,
  thinking = false,
  transparent = false,
  children
}) => {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ animationIndex: number }>).detail;
      if (typeof detail?.animationIndex === 'number') {
        avatarService.playMotion(detail.animationIndex);
      }
    };
    window.addEventListener('change-animation', handler);
    return () => window.removeEventListener('change-animation', handler);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('transparent-stage', transparent);
    return () => document.body.classList.remove('transparent-stage');
  }, [transparent]);

  return (
    <div className={`digital-human-stage ${transparent ? 'is-transparent' : ''}`}>
      <div className="digital-human-stage__label">
        <span className={thinking ? 'thinking-pulse' : ''} />
        {thinking ? '小凡正在想…' : '小凡陪着你'}
      </div>
      {children}
      {subtitle && (
        <div className="assistant-subtitle" role="status">
          {subtitle}
        </div>
      )}
    </div>
  );
};
