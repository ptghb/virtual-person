import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { avatarService } from '../services/avatar.service';
import { TypewriterText } from './TypewriterText';
import { useCompanionProfile } from '../services/companion-profile.service';
import { EmotionDebugPanel } from './EmotionDebugPanel';
import {
  EMOTION_LABEL_MAP,
  type CompanionEmotion,
  type CompanionEmotionDetail,
  getExpressionForEmotion,
  normalizeCompanionEmotion
} from '../emotion';

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
  const { profile } = useCompanionProfile();
  const [emotionState, setEmotionState] = useState<CompanionEmotionDetail>({
    emotion: 'neutral',
    intensity: 0
  });
  const emotionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmotionRef = useRef<string>('neutral');

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
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<CompanionEmotionDetail>).detail;
      const emotion = normalizeCompanionEmotion(detail?.emotion);
      const expression =
        detail?.expression ??
        getExpressionForEmotion(avatarService.getCurrentModelName(), emotion);

      // 防抖：相同情绪在 500ms 内只处理一次，避免高频对话时表情频繁闪烁
      if (emotionDebounceRef.current) {
        clearTimeout(emotionDebounceRef.current);
      }
      emotionDebounceRef.current = setTimeout(() => {
        // 如果情绪没变且强度差异 < 0.1，跳过表情切换
        if (
          emotion === lastEmotionRef.current &&
          Math.abs((detail?.intensity ?? 0) - emotionState.intensity) < 0.1
        ) {
          return;
        }
        lastEmotionRef.current = emotion;
        avatarService.setExpression(expression);
        setEmotionState({
          emotion,
          expression,
          emotionLabel: detail?.emotionLabel,
          intensity: detail?.intensity,
          reason: detail?.reason
        });
      }, 500);
    };
    window.addEventListener('companion-emotion', handler);
    return () => {
      window.removeEventListener('companion-emotion', handler);
      if (emotionDebounceRef.current) {
        clearTimeout(emotionDebounceRef.current);
      }
    };
  }, [emotionState.intensity]);

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

  const emotion = emotionState.emotion as CompanionEmotion;
  const labelText = thinking
    ? `${profile.name}正在想…`
    : `${profile.name}${EMOTION_LABEL_MAP[emotion] ?? '陪着你'}`;

  return (
    <div
      ref={stageRef}
      className={`digital-human-stage digital-human-stage--emotion-${emotion} ${
        transparent ? 'is-transparent' : ''
      }`}
    >
      <EmotionDebugPanel />
      <div className="digital-human-stage__label">
        <span className={thinking ? 'thinking-pulse' : ''} />
        {labelText}
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
