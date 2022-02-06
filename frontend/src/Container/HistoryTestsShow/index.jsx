import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import axios from 'axios';

import './index.css';
import Head from '../Head';
import { showImportantMessage } from '../../redux/actionCreators/head'
import {
  setAxiosDefaults, axiosResponseInterceptor,
  timeStampToString, arabicNumberToChineseNumber
} from '../../helperFunctions';

class HistoryTestsShow extends Component {
  static propTypes = {
    match: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    token: PropTypes.string.isRequired,
    showImportantMessage: PropTypes.func.isRequired
  }

  state = { historyTests: [], lastShowdedTestIndex: 7 }

  lazyLoad = () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const { historyTests, lastShowdedTestIndex } = this.state;
    if (clientHeight + scrollTop >= scrollHeight && lastShowdedTestIndex < historyTests.length - 1) {
      this.setState({ lastShowdedTestIndex: lastShowdedTestIndex + 8 });
    }
  }

  showTestResultDetails (testId) {
    this.props.history.push(`/testResults/${this.props.match.params.testPaperId}/${testId}`);
  }

  async componentDidMount () {
    const {
      token, showImportantMessage,
      history: { replace }, match: { params: { testPaperId } }
    } = this.props;
    if (!token) { replace('/confirmIdentity'); return showImportantMessage('请先登录'); }
    setAxiosDefaults(axios, token); // 设置axios
    axios.interceptors.response.use(...axiosResponseInterceptor(showImportantMessage));
    let historyTests; // 获取历史测验记录Id
    try { // 试卷Id不对则返回试卷展示页面
      historyTests = (await axios.get(`/admin/quiz/${testPaperId}`)).data.oldSessions
    } catch (error) { return replace('/testPapersShow') }
    this.setState({ historyTests: historyTests.map(e => [e, undefined]) });
    window.addEventListener('scroll', this.lazyLoad);
  }

  componentWillUnmount () { window.removeEventListener('scroll', this.lazyLoad) }

  render () {
    const { historyTests, lastShowdedTestIndex } = this.state;
    return (
      <div>
        <Head />
        <div className="historyTestsShow">
          {historyTests.slice(0, lastShowdedTestIndex + 1).map((e, i) => (
            <div
              key={e[0]}
              className="test"
              onClick={() => this.showTestResultDetails(e[0])}
            >
              <div>{`第${arabicNumberToChineseNumber(historyTests.length - i)}次测验`}</div>
              <div>
                {(() => {
                  if (historyTests[i][1]) return historyTests[i][1];
                  else if (historyTests[i][1] === null) return '';
                  (async () => {
                    const { results } = (await axios.get(`/admin/session/${e[0]}/results`)).data;
                    const { historyTests } = this.state;
                    if (!results.length) historyTests[i][1] = '无人参加';
                    else {
                      const { questionStartedAt } = results[0].answers[0];
                      if (!questionStartedAt) historyTests[i][1] = '测验在准备阶段被终止';
                      else historyTests[i][1] = timeStampToString(new Date(questionStartedAt));
                    }
                    this.setState({ historyTests })
                  })();
                  historyTests[i][1] = null;
                  this.setState({ historyTests })
                  return '';
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
}

export default connect(
  reduxStore => ({ token: reduxStore.identity.token }),
  () => ({ showImportantMessage }))(HistoryTestsShow);
