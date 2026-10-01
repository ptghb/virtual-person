export interface AssistantDecision {
  reply_id: string;
  emotion: string;
  emotion_label: string;
  emotion_intensity: number;
  emotion_reason: string;
  animation_index: number;
  expression: string | null;
  should_take_photo: boolean;
  prompt: string;
  source: string;
  protocol_version: string;
}

export interface AssistantMetaData {
  reply_id?: string;
  emotion?: string;
  emotion_label?: string;
  emotion_intensity?: number;
  emotion_reason?: string;
  animation_index?: number;
  expression?: string | null;
  should_take_photo?: boolean;
  prompt?: string;
  protocol_version?: string;
  decision?: Partial<AssistantDecision>;
}

/** 协议 V2 优先读取 decision；缺失字段回退到旧版扁平结构。 */
export function resolveAssistantDecision(
  data: AssistantMetaData
): AssistantMetaData {
  const decision = data.decision ?? {};
  return {
    reply_id: decision.reply_id ?? data.reply_id,
    emotion: decision.emotion ?? data.emotion,
    emotion_label: decision.emotion_label ?? data.emotion_label,
    emotion_intensity:
      decision.emotion_intensity ?? data.emotion_intensity,
    emotion_reason: decision.emotion_reason ?? data.emotion_reason,
    animation_index:
      decision.animation_index ?? data.animation_index,
    expression: decision.expression ?? data.expression,
    should_take_photo:
      decision.should_take_photo ?? data.should_take_photo,
    prompt: decision.prompt ?? data.prompt,
    protocol_version:
      decision.protocol_version ?? data.protocol_version
  };
}
