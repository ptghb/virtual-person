/**
 * 输出指定用户弹幕
 * @param msg
 * @param nickname
 */
export const logUserCast = function (msg: any, nickname: string) {
  if (msg?.user?.nickname === nickname) {
    console.log(msg);
  }
};
