import reduxStore from '../store'
import { SHOW_IMPORTANT_MESSAGE, POP_IMPORTANT_MESSAGE } from '../constant'

export function showImportantMessage (importantMessage) {
  reduxStore.dispatch({ type: SHOW_IMPORTANT_MESSAGE, value: importantMessage });
}

export function popImportantMessage () {
  reduxStore.dispatch({ type: POP_IMPORTANT_MESSAGE, value: '' });
}
