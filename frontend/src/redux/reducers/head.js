import { SHOW_IMPORTANT_MESSAGE, POP_IMPORTANT_MESSAGE } from '../constant'

const defaultTemplate = { importantMessages: [] };
export default (pre = defaultTemplate, action) => {
  switch (action.type) {
    case SHOW_IMPORTANT_MESSAGE:
      // 当错误和上一个错误一致不添加该错误
      if (pre.importantMessages.length && action.value === pre.importantMessages.slice(-1)[0]) {
        return { importantMessages: [...pre.importantMessages] };
      // 当错误和上一个错误不一致则添加该错误
      } else return { importantMessages: [...pre.importantMessages, action.value] };
    case POP_IMPORTANT_MESSAGE:
      return { importantMessages: [...pre.importantMessages.slice(0, -1)] };
    default: return pre;
  }
}
