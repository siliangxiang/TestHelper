import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Switch, Route, Redirect } from 'react-router-dom'

import './App.css'
import ConfirmIdentity from './Container/ConfirmIdentity'
import TestPapersShow from './Container/TestPapersShow'
import TestPaperQuestionsShow from './Container/TestPaperQuestionsShow'
import QuestionModify from './Container/QuestionModify'
import TestGoing from './Container/TestGoing'
import TestResults from './Container/TestResults'
import HistoryTestsShow from './Container/HistoryTestsShow'

class App extends React.Component {
  static propTypes = { token: PropTypes.string.isRequired }

  state = { appMinHeight: window.innerHeight }

  updateAppMinHeight = () => { this.setState({ appMinHeight: window.innerHeight }) }

  componentDidMount () { window.addEventListener('resize', this.updateAppMinHeight); }

  componentWillUnmount () { window.removeEventListener('resize', this.updateAppMinHeight); }

  render () {
    const { token } = this.props;
    return (
      <div
        className='app'
        style={{ minHeight: `${this.state.appMinHeight}px` }}
      >
        <Switch>
          <Route path='/confirmIdentity' component={ConfirmIdentity} />
          <Route path='/testPapersShow' component={TestPapersShow} />
          <Route path='/testPaperQuestionsShow/:testPaperId' component={TestPaperQuestionsShow} />
          <Route path='/questionModify/:testPaperId/:questionOrder' component={QuestionModify} />
          {/* 老师的testGoing的path就是下面这样，学生的还需在后面补上自己的examineeId */}
          <Route path='/testGoing' component={TestGoing} />
          <Route path='/testResults/:testPaperId/:testId' component={TestResults}/>
          <Route path='/historyTestsShow/:testPaperId' component={HistoryTestsShow}/>
          <Redirect to={token ? '/testPapersShow' : '/confirmIdentity'}/>
        </Switch>
      </div>
    );
  }
}

export default connect(
  (reduxStore) => ({ token: reduxStore.identity.token }),
  () => ({}))(App);
