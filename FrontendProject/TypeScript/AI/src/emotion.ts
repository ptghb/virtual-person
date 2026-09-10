export type CompanionEmotion =
  | 'neutral'
  | 'happy'
  | 'shy'
  | 'sad'
  | 'worried'
  | 'wronged'
  | 'angry'
  | 'comforting'
  | 'playful'
  | 'sleepy';

export interface CompanionEmotionDetail {
  emotion: CompanionEmotion;
  emotionLabel?: string;
  intensity?: number;
  reason?: string;
  expression?: string | null;
}

export const EMOTION_LABEL_MAP: Record<CompanionEmotion, string> = {
  neutral: '陪着你',
  happy: '很开心',
  shy: '有点害羞',
  sad: '有点难过',
  worried: '有点担心你',
  wronged: '有点委屈',
  angry: '有点生气',
  comforting: '想安慰你',
  playful: '想逗你开心',
  sleepy: '有点困了'
};

export const EXPRESSION_MAP: Partial<
  Record<string, Partial<Record<CompanionEmotion, string>>>
> = {
  Hiyori: {
    neutral: 'Normal',
    happy: 'Smile',
    shy: 'Blushing',
    sad: 'Sad',
    worried: 'Sad',
    wronged: 'Wronged',
    angry: 'Angry',
    comforting: 'Smile',
    playful: 'Blushing',
    sleepy: 'Sad'
  },
  Haru: {
    neutral: 'F01',
    happy: 'F02',
    shy: 'F03',
    sad: 'F04',
    worried: 'F04',
    wronged: 'F05',
    angry: 'F06',
    comforting: 'F02',
    playful: 'F07',
    sleepy: 'F04'
  },
  Mao: {
    neutral: 'exp_01',
    happy: 'exp_02',
    shy: 'exp_03',
    sad: 'exp_04',
    worried: 'exp_04',
    wronged: 'exp_05',
    angry: 'exp_06',
    comforting: 'exp_02',
    playful: 'exp_07',
    sleepy: 'exp_04'
  },
  Ren: {
    neutral: 'exp_01',
    happy: 'exp_02',
    shy: 'exp_03',
    sad: 'exp_04',
    worried: 'exp_04',
    wronged: 'exp_05',
    angry: 'exp_04',
    comforting: 'exp_02',
    playful: 'exp_03',
    sleepy: 'exp_04'
  },
  Natori: {
    neutral: 'Normal',
    happy: 'Smile',
    shy: 'Blushing',
    sad: 'Sad',
    worried: 'Sad',
    wronged: 'Sad',
    angry: 'Angry',
    comforting: 'Smile',
    playful: 'Blushing',
    sleepy: 'Sad'
  },
  Mark: {
    neutral: 'Normal',
    happy: 'Smile',
    shy: 'Blushing',
    sad: 'Sad',
    worried: 'Sad',
    wronged: 'Wronged',
    angry: 'Angry',
    comforting: 'Smile',
    playful: 'Blushing',
    sleepy: 'Sad'
  },
  Rice: {
    neutral: 'Normal',
    happy: 'Smile',
    shy: 'Blushing',
    sad: 'Sad',
    worried: 'Sad',
    wronged: 'Wronged',
    angry: 'Angry',
    comforting: 'Smile',
    playful: 'Blushing',
    sleepy: 'Sad'
  },
  Wanko: {
    neutral: 'Normal',
    happy: 'Smile',
    shy: 'Blushing',
    sad: 'Sad',
    worried: 'Sad',
    wronged: 'Wronged',
    angry: 'Angry',
    comforting: 'Smile',
    playful: 'Blushing',
    sleepy: 'Sad'
  }
};

export function normalizeCompanionEmotion(value: unknown): CompanionEmotion {
  const emotion = String(value || 'neutral') as CompanionEmotion;
  return Object.prototype.hasOwnProperty.call(EMOTION_LABEL_MAP, emotion)
    ? emotion
    : 'neutral';
}

export function getExpressionForEmotion(
  modelName: string,
  emotion: CompanionEmotion
): string | null {
  const modelMap = EXPRESSION_MAP[modelName];
  return modelMap?.[emotion] ?? modelMap?.neutral ?? null;
}
