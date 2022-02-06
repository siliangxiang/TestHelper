import { createStore } from 'redux'
import storage from 'redux-persist/es/storage'
import { persistCombineReducers, persistStore } from 'redux-persist'
import { composeWithDevTools } from 'redux-devtools-extension'

import head from './reducers/head'
import identity from './reducers/identity'

const persistConfig = { key: 'root', storage, blacklist: ['head'] };
const reducers = persistCombineReducers(persistConfig, { head, identity });
const reduxStore = createStore(reducers, composeWithDevTools());
export default reduxStore;
export const persistReduxStore = persistStore(reduxStore);
