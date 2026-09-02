import pako from './pako.esm.mjs';
import {
  decodePushFrame,
  decodeResponse,
  decodeChatMessage,
  decodeGiftMessage,
  decodeLikeMessage,
  decodeMemberMessage,
  decodeSocialMessage,
  decodeControlMessage,
  decodeRoomUserSeqMessage,
  decodeRoomStatsMessage,
  decodeEmojiChatMessage,
  encodePushFrame
} from './model.js';

const PayloadType = { Ack: 'ack', Hb: 'hb', Msg: 'msg', Close: 'close' };
const CastMethod = {
  CHAT: 'WebcastChatMessage', GIFT: 'WebcastGiftMessage', LIKE: 'WebcastLikeMessage',
  MEMBER: 'WebcastMemberMessage', SOCIAL: 'WebcastSocialMessage', ROOM_USER_SEQ: 'WebcastRoomUserSeqMessage',
  CONTROL: 'WebcastControlMessage', ROOM_STATS: 'WebcastRoomStatsMessage', EMOJI_CHAT: 'WebcastEmojiChatMessage'
};

function b64(bytes) { return Buffer.from(bytes).toString('base64'); }
function fromB64(value) { return new Uint8Array(Buffer.from(value, 'base64')); }
function castUser(user) {
  if (!user) return undefined;
  return { id: user.secUid, name: user.nickname, gender: user.gender, avatar: user.avatarThumb?.urlList?.[0] };
}
function castGift(gift, count, end) {
  if (!gift) return undefined;
  return { id: gift.id, name: gift.name, price: gift.diamondCount, type: gift.type, desc: gift.describe, icon: gift.image?.urlList?.[0], count, repeatEnd: end };
}
function castMessage(msg) {
  const method = msg.method;
  const payload = msg.payload;
  if (!payload) return null;
  const data = { id: msg.msgId };
  try {
    let message;
    switch (method) {
      case CastMethod.CHAT:
        message = decodeChatMessage(payload); data.method = CastMethod.CHAT; data.user = castUser(message.user); data.content = message.content; break;
      case CastMethod.GIFT:
        message = decodeGiftMessage(payload); data.method = CastMethod.GIFT; data.user = castUser(message.user); data.gift = castGift(message.gift, message.repeatCount || message.comboCount, message.repeatEnd); break;
      case CastMethod.LIKE:
        message = decodeLikeMessage(payload); data.method = CastMethod.LIKE; data.user = castUser(message.user); data.content = `为主播点赞了(${message.count})`; data.room = { likeCount: message.total }; break;
      case CastMethod.MEMBER:
        message = decodeMemberMessage(payload); data.method = CastMethod.MEMBER; data.user = castUser(message.user); data.content = '进入直播间'; data.room = { audienceCount: message.memberCount }; break;
      case CastMethod.SOCIAL:
        message = decodeSocialMessage(payload); data.method = CastMethod.SOCIAL; data.user = castUser(message.user); data.content = '关注了主播'; data.room = { followCount: message.followCount }; break;
      case CastMethod.EMOJI_CHAT:
        message = decodeEmojiChatMessage(payload); data.method = CastMethod.EMOJI_CHAT; data.user = castUser(message.user); data.content = message.emojiContent?.pieces?.[0]?.imageValue?.image?.urlList?.[0]; break;
      case CastMethod.ROOM_USER_SEQ:
        message = decodeRoomUserSeqMessage(payload); data.method = CastMethod.ROOM_USER_SEQ; data.room = { audienceCount: message.total, totalUserCount: message.totalUser }; break;
      case CastMethod.ROOM_STATS:
        message = decodeRoomStatsMessage(payload); data.method = CastMethod.ROOM_STATS; data.room = { audienceCount: message.displayMiddle }; break;
      case CastMethod.CONTROL:
        message = decodeControlMessage(payload); data.method = CastMethod.CONTROL; data.content = message.common?.describe; data.room = { status: parseInt(message.action || '') || undefined }; break;
      default: return null;
    }
    return data.method ? data : null;
  } catch { return null; }
}
function ackBytes(ext = '', logId) {
  return encodePushFrame({ payloadType: PayloadType.Ack, payload: new TextEncoder().encode(ext), logId });
}
function decodeFrame(input) {
  const frame = decodePushFrame(fromB64(input.data));
  let payload = frame.payload;
  const headers = frame.headersList || {};
  let cursor = headers['im-cursor'] || '';
  let internalExt = headers['im-internal_ext'] || '';
  if (!payload) return { messages: [] };
  if (headers['compress_type'] === 'gzip') payload = pako.ungzip(payload);
  const response = decodeResponse(payload);
  if (!cursor && response.cursor) cursor = response.cursor;
  if (!internalExt && response.internalExt) internalExt = response.internalExt;
  const messages = frame.payloadType === PayloadType.Msg ? (response.messages || []).map(castMessage).filter(Boolean) : [];
  const ack = response.needAck ? b64(ackBytes(internalExt, frame.logId)) : undefined;
  return { payloadType: frame.payloadType, cursor, internalExt, needAck: !!response.needAck, ack, messages };
}
function decodeIm(input) {
  const response = decodeResponse(fromB64(input.data));
  const messages = (response.messages || []).map(castMessage).filter(Boolean);
  return { cursor: response.cursor, internalExt: response.internalExt, now: response.now, pushServer: response.pushServer, fetchInterval: response.fetchInterval, fetchType: response.fetchType, liveCursor: response.liveCursor, messages };
}
function ping() { return { data: b64(encodePushFrame({ payloadType: PayloadType.Hb })) }; }

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const payload = JSON.parse(input || '{}');
    const result = payload.mode === 'frame' ? decodeFrame(payload) : payload.mode === 'im' ? decodeIm(payload) : payload.mode === 'ping' ? ping() : {};
    process.stdout.write(JSON.stringify({ ok: true, result }));
  } catch (error) {
    process.stdout.write(JSON.stringify({ ok: false, error: String(error?.stack || error) }));
    process.exitCode = 1;
  }
});
