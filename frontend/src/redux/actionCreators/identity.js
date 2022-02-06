import reduxStore from '../store'
import { CHANGE_TOKEN } from '../constant'

export function changeToken (token) {
  reduxStore.dispatch({ type: CHANGE_TOKEN, value: token });
}
