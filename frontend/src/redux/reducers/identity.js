import { CHANGE_TOKEN } from '../constant'

const defaultTemplate = { token: '' };
export default (pre = defaultTemplate, action) => {
  switch (action.type) {
    case CHANGE_TOKEN: return { ...pre, token: action.value };
    default: return pre;
  }
}
