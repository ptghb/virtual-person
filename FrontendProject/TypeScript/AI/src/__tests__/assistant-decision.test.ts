import { describe, expect, it } from 'vitest';
import { resolveAssistantDecision } from '../services/assistant-decision';

describe('resolveAssistantDecision', () => {
  it('prefers protocol v2 decision fields', () => {
    const result = resolveAssistantDecision({
      emotion: 'sad',
      animation_index: 7,
      decision: {
        emotion: 'happy',
        animation_index: 1,
        expression: 'Smile',
        protocol_version: '2.0'
      }
    });

    expect(result.emotion).toBe('happy');
    expect(result.animation_index).toBe(1);
    expect(result.expression).toBe('Smile');
    expect(result.protocol_version).toBe('2.0');
  });

  it('keeps compatibility with legacy flat metadata', () => {
    const result = resolveAssistantDecision({
      reply_id: 'reply_legacy',
      emotion: 'shy',
      emotion_intensity: 0.7,
      should_take_photo: true
    });

    expect(result.reply_id).toBe('reply_legacy');
    expect(result.emotion).toBe('shy');
    expect(result.emotion_intensity).toBe(0.7);
    expect(result.should_take_photo).toBe(true);
  });
});
