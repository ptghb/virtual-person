import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { avatarService } from '../services/avatar.service';
import { TypewriterText } from './TypewriterText';

interface DigitalHumanStageProps {
  subtitle?: string;
  thinking?: boolean;
  streaming?: boolean;
  transparent?: boolean;
  children?: React.ReactNode;
}

export const DigitalHumanStage: React.FC<DigitalHumanStageProps> = ({
  subtitle,
  thinking = false,
  streaming = false,
  transparent = false,
  children
}) => {
  const stageRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const canvas = document.querySelector<HTMLCanvasElement>('.live2d-canvas');
    if (!canvas) return;

    const originalParent = canvas.parentNode;
    const originalNextSibling = canvas.nextSibling;
    const originalStyle = canvas.getAttribute('style');

    stage.prepend(canvas);
    Object.assign(canvas.style, {
      position: 'absolute',
      inset: '0',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '0',
      borderRadius: 'inherit',
      boxShadow: '0 24px 70px rgba(103, 62, 83, 0.2)',
      pointerEvents: 'none'
    });

    return () => {
      if (originalParent) {
        originalParent.insertBefore(canvas, originalNextSibling);
      }
      if (originalStyle === null) {
        canvas.removeAttribute('style');
      } else {
        canvas.setAttribute('style', originalStyle);
      }
    };
  }, [transparent]);

  return (
    <div
      ref={stageRef}
      className={`digital-human-stage ${transparent ? 'is-transparent' : ''}`}
    >
      <div className="digital-human-stage__label">
        <span className={thinking ? 'thinking-pulse' : ''} />
        {thinking ? '小凡正在想…' : '小凡陪着你'}
      </div>
      {children}
      {subtitle && (
        <div className="assistant-subtitle" role="status">
          {streaming ? (
            <span className="typewriter-text">
              {subtitle}
              <i className="typewriter-cursor" aria-hidden="true" />
            </span>
          ) : (
            <TypewriterText text={subtitle} />
          )}
        </div>
      )}
    </div>
  );
};
