import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { PersistGate } from 'redux-persist/es/integration/react';

import './index.css'
import App from './App'
import reduxStore, { persistReduxStore } from './redux/store'

ReactDOM.render(
  <Provider store={reduxStore}>
    <PersistGate persistor={persistReduxStore}>
      <BrowserRouter>
        <React.StrictMode>
          <App />
        </React.StrictMode>
      </BrowserRouter>
    </PersistGate>
  </Provider>, document.getElementById('root')
);
