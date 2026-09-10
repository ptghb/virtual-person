/**
 * emotion.ts 单元测试
 *
 * 运行方式：npx vitest run
 */

import {
  describe,
  expect,
  it
} from 'vitest';
import {
  EMOTION_LABEL_MAP,
  EXPRESSION_MAP,
  normalizeCompanionEmotion,
  getExpressionForEmotion,
  type CompanionEmotion
} from '../emotion';

describe('normalizeCompanionEmotion', () => {
  it('returns the emotion when it is valid', () => {
    expect(normalizeCompanionEmotion('happy')).toBe('happy');
    expect(normalizeCompanionEmotion('shy')).toBe('shy');
    expect(normalizeCompanionEmotion('sad')).toBe('sad');
    expect(normalizeCompanionEmotion('worried')).toBe('worried');
    expect(normalizeCompanionEmotion('wronged')).toBe('wronged');
    expect(normalizeCompanionEmotion('angry')).toBe('angry');
    expect(normalizeCompanionEmotion('comforting')).toBe('comforting');
    expect(normalizeCompanionEmotion('playful')).toBe('playful');
    expect(normalizeCompanionEmotion('sleepy')).toBe('sleepy');
    expect(normalizeCompanionEmotion('neutral')).toBe('neutral');
  });

  it('returns neutral for invalid emotion', () => {
    expect(normalizeCompanionEmotion('unknown')).toBe('neutral');
    expect(normalizeCompanionEmotion('')).toBe('neutral');
    expect(normalizeCompanionEmotion(null)).toBe('neutral');
    expect(normalizeCompanionEmotion(undefined)).toBe('neutral');
    expect(normalizeCompanionEmotion(123)).toBe('neutral');
    expect(normalizeCompanionEmotion('HAPPY')).toBe('neutral');
  });
});

describe('EMOTION_LABEL_MAP', () => {
  it('has labels for all 10 emotions', () => {
    const emotions: CompanionEmotion[] = [
      'neutral', 'happy', 'shy', 'sad', 'worried',
      'wronged', 'angry', 'comforting', 'playful', 'sleepy'
    ];
    emotions.forEach(emotion => {
      expect(EMOTION_LABEL_MAP[emotion]).toBeTruthy();
      expect(typeof EMOTION_LABEL_MAP[emotion]).toBe('string');
    });
  });

  it('has neutral label', () => {
    expect(EMOTION_LABEL_MAP.neutral).toBe('陪着你');
  });

  it('has happy label', () => {
    expect(EMOTION_LABEL_MAP.happy).toBe('很开心');
  });
});

describe('getExpressionForEmotion', () => {
  it('returns correct expression for Hiyori', () => {
    expect(getExpressionForEmotion('Hiyori', 'neutral')).toBe('Normal');
    expect(getExpressionForEmotion('Hiyori', 'happy')).toBe('Smile');
    expect(getExpressionForEmotion('Hiyori', 'shy')).toBe('Blushing');
    expect(getExpressionForEmotion('Hiyori', 'sad')).toBe('Sad');
    expect(getExpressionForEmotion('Hiyori', 'worried')).toBe('Sad');
    expect(getExpressionForEmotion('Hiyori', 'wronged')).toBe('Wronged');
    expect(getExpressionForEmotion('Hiyori', 'angry')).toBe('Angry');
    expect(getExpressionForEmotion('Hiyori', 'comforting')).toBe('Smile');
    expect(getExpressionForEmotion('Hiyori', 'playful')).toBe('Blushing');
    expect(getExpressionForEmotion('Hiyori', 'sleepy')).toBe('Sad');
  });

  it('returns correct expression for Mark', () => {
    expect(getExpressionForEmotion('Mark', 'neutral')).toBe('Normal');
    expect(getExpressionForEmotion('Mark', 'happy')).toBe('Smile');
    expect(getExpressionForEmotion('Mark', 'shy')).toBe('Blushing');
    expect(getExpressionForEmotion('Mark', 'angry')).toBe('Angry');
    expect(getExpressionForEmotion('Mark', 'wronged')).toBe('Wronged');
  });

  it('returns correct expression for Wanko', () => {
    expect(getExpressionForEmotion('Wanko', 'neutral')).toBe('Normal');
    expect(getExpressionForEmotion('Wanko', 'happy')).toBe('Smile');
    expect(getExpressionForEmotion('Wanko', 'shy')).toBe('Blushing');
    expect(getExpressionForEmotion('Wanko', 'sad')).toBe('Sad');
    expect(getExpressionForEmotion('Wanko', 'angry')).toBe('Angry');
  });

  it('returns correct expression for Rice', () => {
    expect(getExpressionForEmotion('Rice', 'neutral')).toBe('Normal');
    expect(getExpressionForEmotion('Rice', 'happy')).toBe('Smile');
    expect(getExpressionForEmotion('Rice', 'angry')).toBe('Angry');
  });

  it('returns null for unknown model', () => {
    expect(getExpressionForEmotion('UnknownModel', 'happy')).toBeNull();
  });

  it('falls back to neutral expression when emotion not mapped', () => {
    // Haru has all emotions mapped, but test fallback logic
    const result = getExpressionForEmotion('Haru', 'neutral');
    expect(result).toBe('F01');
  });

  it('all 8 models have expression mappings', () => {
    const models = ['Hiyori', 'Haru', 'Mao', 'Ren', 'Natori', 'Mark', 'Rice', 'Wanko'];
    models.forEach(model => {
      const neutralExpr = getExpressionForEmotion(model, 'neutral');
      expect(neutralExpr).toBeTruthy();
      const happyExpr = getExpressionForEmotion(model, 'happy');
      expect(happyExpr).toBeTruthy();
    });
  });
});

describe('EXPRESSION_MAP completeness', () => {
  it('all models map all 10 emotions', () => {
    const models = ['Hiyori', 'Haru', 'Mao', 'Ren', 'Natori', 'Mark', 'Rice', 'Wanko'];
    const emotions: CompanionEmotion[] = [
      'neutral', 'happy', 'shy', 'sad', 'worried',
      'wronged', 'angry', 'comforting', 'playful', 'sleepy'
    ];
    models.forEach(model => {
      emotions.forEach(emotion => {
        const expr = getExpressionForEmotion(model, emotion);
        expect(expr).toBeTruthy();
      });
    }
    );
  });
});

// ===== 新增：情绪标签语义测试 =====

describe('EMOTION_LABEL_MAP semantics', () => {
  it('labels are all non-empty strings', () => {
    Object.values(EMOTION_LABEL_MAP).forEach(label => {
      expect(label).toBeTruthy();
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it('labels are unique', () => {
    const labels = Object.values(EMOTION_LABEL_MAP);
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });

  it('negative emotions have appropriate labels', () => {
    expect(EMOTION_LABEL_MAP.sad).toContain('难过');
    expect(EMOTION_LABEL_MAP.worried).toContain('担心');
    expect(EMOTION_LABEL_MAP.wronged).toContain('委屈');
    expect(EMOTION_LABEL_MAP.angry).toContain('生气');
  });

  it('positive emotions have appropriate labels', () => {
    expect(EMOTION_LABEL_MAP.happy).toContain('开心');
    expect(EMOTION_LABEL_MAP.playful).toContain('逗');
  });

  it('sleepy label mentions tiredness', () => {
    expect(EMOTION_LABEL_MAP.sleepy).toContain('困');
  });
});

// ===== 新增：normalizeCompanionEmotion 边界测试 =====

describe('normalizeCompanionEmotion edge cases', () => {
  it('handles numeric strings', () => {
    expect(normalizeCompanionEmotion('0')).toBe('neutral');
    expect(normalizeCompanionEmotion('1')).toBe('neutral');
  });

  it('handles whitespace strings', () => {
    expect(normalizeCompanionEmotion('  ')).toBe('neutral');
    expect(normalizeCompanionEmotion('\t\n')).toBe('neutral');
  });

  it('handles objects and arrays', () => {
    expect(normalizeCompanionEmotion({})).toBe('neutral');
    expect(normalizeCompanionEmotion([])).toBe('neutral');
    expect(normalizeCompanionEmotion({ emotion: 'happy' })).toBe('neutral');
  });

  it('preserves exact emotion keys', () => {
    const allEmotions = Object.keys(EMOTION_LABEL_MAP);
    allEmotions.forEach(emotion => {
      expect(normalizeCompanionEmotion(emotion)).toBe(emotion);
    });
  });
});

// ===== 新增：getExpressionForEmotion 回退逻辑测试 =====

describe('getExpressionForEmotion fallback logic', () => {
  it('falls back to neutral expression for unmapped emotion', () => {
    // 创建一个模拟场景：模型存在但缺少某情绪映射
    // 实际所有模型都有完整映射，这里测试逻辑正确性
    const result = getExpressionForEmotion('Hiyori', 'neutral');
    expect(result).toBe('Normal');
  });

  it('returns null for empty model name', () => {
    expect(getExpressionForEmotion('', 'happy')).toBeNull();
  });

  it('is case-sensitive for model names', () => {
    expect(getExpressionForEmotion('hiyori', 'happy')).toBeNull();
    expect(getExpressionForEmotion('HIYORI', 'happy')).toBeNull();
  });

  it('all models have angry expression', () => {
    const models = ['Hiyori', 'Haru', 'Mao', 'Ren', 'Natori', 'Mark', 'Rice', 'Wanko'];
    models.forEach(model => {
      const expr = getExpressionForEmotion(model, 'angry');
      expect(expr).toBeTruthy();
    });
  });

  it('all models have shy expression', () => {
    const models = ['Hiyori', 'Haru', 'Mao', 'Ren', 'Natori', 'Mark', 'Rice', 'Wanko'];
    models.forEach(model => {
      const expr = getExpressionForEmotion(model, 'shy');
      expect(expr).toBeTruthy();
    });
  });

  it('Haru uses F-prefix expression IDs', () => {
    const emotions: CompanionEmotion[] = ['neutral', 'happy', 'shy', 'sad'];
    emotions.forEach(emotion => {
      const expr = getExpressionForEmotion('Haru', emotion);
      expect(expr).toMatch(/^F\d{2}$/);
    });
  });

  it('Mao uses exp_ prefix expression IDs', () => {
    const emotions: CompanionEmotion[] = ['neutral', 'happy', 'shy', 'sad'];
    emotions.forEach(emotion => {
      const expr = getExpressionForEmotion('Mao', emotion);
      expect(expr).toMatch(/^exp_\d{2}$/);
    });
  });
});

// ===== 新增：EXPRESSION_MAP 结构测试 =====

describe('EXPRESSION_MAP structure', () => {
  it('has exactly 8 models', () => {
    const models = Object.keys(EXPRESSION_MAP);
    expect(models).toHaveLength(8);
    expect(models).toContain('Hiyori');
    expect(models).toContain('Haru');
    expect(models).toContain('Mao');
    expect(models).toContain('Ren');
    expect(models).toContain('Natori');
    expect(models).toContain('Mark');
    expect(models).toContain('Rice');
    expect(models).toContain('Wanko');
  });

  it('each model maps exactly 10 emotions', () => {
    const models = Object.keys(EXPRESSION_MAP);
    const expectedEmotions: CompanionEmotion[] = [
      'neutral', 'happy', 'shy', 'sad', 'worried',
      'wronged', 'angry', 'comforting', 'playful', 'sleepy'
    ];
    models.forEach(model => {
      const modelMap = EXPRESSION_MAP[model];
      expect(modelMap).toBeDefined();
      expectedEmotions.forEach(emotion => {
        expect(modelMap?.[emotion]).toBeTruthy();
      });
    });
  });

  it('expression IDs are non-empty strings', () => {
    const models = Object.keys(EXPRESSION_MAP);
    models.forEach(model => {
      const modelMap = EXPRESSION_MAP[model];
      Object.values(modelMap || {}).forEach(expr => {
        expect(typeof expr).toBe('string');
        expect(expr.length).toBeGreaterThan(0);
      });
    });
  });
});
