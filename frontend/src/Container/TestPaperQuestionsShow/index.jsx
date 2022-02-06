import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import axios from 'axios'

import Head from '../Head'
import './index.css'
import { showImportantMessage } from '../../redux/actionCreators/head'
import {
  setAxiosDefaults,
  axiosResponseInterceptor,
  checkTestPaperId,
  arabicNumberToChineseNumber
} from '../../helperFunctions'

class testPaperQuestionsShow extends Component {
  static propTypes = {
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    token: PropTypes.string.isRequired,
    showImportantMessage: PropTypes.func.isRequired
  }

  state = {
    testPaperOrder: 0,
    questions: [],
    openControlBoard: false,
    controledQuestionOrder: 0
  }

  controlQuestion = async event => {
    const buttonName = event.target.innerHTML.trim();
    const testPaperId = this.props.location.pathname.split('/')[2];
    if (buttonName === '修改这道题目') this.addOrModifyQuestion(this.state.controledQuestionOrder);
    else if (buttonName === '删除这道题目') {
      const testPaperInfo = (await axios.get(`/admin/quiz/${testPaperId}/`)).data;
      testPaperInfo.questions.splice(this.state.controledQuestionOrder - 1, 1);
      testPaperInfo.questions.forEach((e, i) => { e.questionOrder = i + 1; });
      await axios.put(`/admin/quiz/${testPaperId}`, testPaperInfo);
      this.setState({
        openControlBoard: false, controledQuestionOrder: 0, questions: testPaperInfo.questions
      });
    } else if (buttonName === '返回') {
      this.setState({ openControlBoard: false, controledQuestionOrder: 0 });
    }
  }

  addOrModifyQuestion = (questionOrder) => {
    const { state: { testPaperOrder, questions }, props: { location, history } } = this;
    history.push(
      `/questionModify/${location.pathname.split('/')[2]}/${questionOrder}`,
      {
        testPapersShowInfo: location.state
          ? { ...location.state.testPapersShowInfo, testPaperOrder }
          : { testPaperOrder },
        testPaperQuestionsShowInfo: {
          questionOrder,
          questionInfo: questions[questionOrder - 1],
          testPaperQuestionsShowScrollTop: document.documentElement.scrollTop
        }
      },
    );
  }

  async componentDidMount () {
    const { token, showImportantMessage, history, location } = this.props;
    if (!location.state) location.state = {};
    const { testPapersShowInfo, testPaperQuestionsShowInfo } = location.state;
    const testPaperId = Number(location.pathname.split('/')[2]);
    setAxiosDefaults(axios, token);
    axios.interceptors.response.use(...axiosResponseInterceptor(showImportantMessage));
    // 检查token和testPaperId是否合法：
    if (!token) { history.replace('/confirmIdentity'); return showImportantMessage('请先登录'); }
    if (!testPapersShowInfo) checkTestPaperId.call(this, axios);
    else this.setState({ testPaperOrder: testPapersShowInfo.testPaperOrder });

    this.setState({ questions: (await axios.get(`/admin/quiz/${testPaperId}`)).data.questions });
    // 更新scrollTop或跳转
    if (testPaperQuestionsShowInfo) {
      if (testPaperQuestionsShowInfo.testPaperQuestionsShowScrollTop !== undefined) {
        document.documentElement.scrollTop = testPaperQuestionsShowInfo.testPaperQuestionsShowScrollTop;
      } else window.location.hash = `#${testPaperQuestionsShowInfo.questionOrder}`
    }
  }

  render () {
    const { testPaperOrder, questions, openControlBoard } = this.state;
    let testPapersShowInfo = {}; const { state } = this.props.location;
    if (state) testPapersShowInfo = { ...state.testPapersShowInfo };
    testPapersShowInfo.testPaperOrder = testPaperOrder;
    return (
      <div>
        <Head testPapersShowInfo={testPapersShowInfo}/>
        <div className='questions clearfix'>
          {/* 用来操作旧题目的面板 */}
          <div
            className='questionControlBoard'
            style={{ display: openControlBoard ? 'block' : 'none', height: `${window.innerHeight}px` }}
            onClick={this.controlQuestion}
          >
            <div>
              <button>修改这道题目</button>
              <button>删除这道题目</button>
              <button>返回</button>
            </div>
          </div>

          {/* 从第一题开始依次展示试卷题目 */}
          {questions.map((e, i) => (
            <div
              key={i}
              id={`${i + 1}`}
              className='question'
              onClick={() => this.setState({ openControlBoard: true, controledQuestionOrder: i + 1 })}
            >
              <div className='questionOrder'>第{arabicNumberToChineseNumber(i + 1)}题:</div>
              <div className='questionDetails'>
                <div className='questionName'>{e.name}</div>
                <div>
                  时限：{e.timeLimit}分钟；
                  分值：{e.score}分；
                  类型：{e.answers.filter(e => e).length > 1 ? '多选' : '单选' }
                </div>
              </div>
            </div>
          ))}

          {/* 点击可新建题目 */}
          <div className='question' id={`${questions.length + 1}`}
            onClick={() => this.addOrModifyQuestion(questions.length + 1)}
          >
            点击此处新增一道题目
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  (reduxStore) => ({ token: reduxStore.identity.token }),
  () => ({ showImportantMessage }))(testPaperQuestionsShow);
