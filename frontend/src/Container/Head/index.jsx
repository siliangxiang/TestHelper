import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'
import { connect } from 'react-redux'
import axios from 'axios'

import './index.css'
import {
  throttle, setAxiosDefaults,
  axiosResponseInterceptor,
  arabicNumberToChineseNumber
} from '../../helperFunctions'
import { showImportantMessage, popImportantMessage } from '../../redux/actionCreators/head'
import { changeToken } from '../../redux/actionCreators/identity'

class Head extends Component {
  static propTypes = {
    testGoingComponent: PropTypes.object,
    testGoingComponentState: PropTypes.object,
    testPapersShowInfo: PropTypes.object,
    testPaperQuestionsShowInfo: PropTypes.object,
    questionInfo: PropTypes.object,
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    token: PropTypes.string.isRequired,
    importantMessages: PropTypes.array.isRequired,
    changeToken: PropTypes.func.isRequired,
    showImportantMessage: PropTypes.func.isRequired,
    popImportantMessage: PropTypes.func.isRequired
  }

  state = { backgroundPictureWidth: window.innerWidth, backgroundPictureHeight: window.innerHeight }

  setRem = () => {
    document.documentElement.style.fontSize = `${document.documentElement.clientWidth / 375}px`;
  }

  getHeadWords () {
    const { testPapersShowInfo, location } = this.props;
    const [_1, curComponentName, _2, questionOrder] = location.pathname.split('/');
    switch (curComponentName) {
      case 'confirmIdentity': return ['', '欢迎使用测验小助手', ''];
      case 'testPapersShow': return ['', '我的试卷', '登出'];
      case 'testPaperQuestionsShow': return ['', `试卷${arabicNumberToChineseNumber(testPapersShowInfo.testPaperOrder)}的题目`, '返回'];
      case 'questionModify': return ['返回', `试卷${arabicNumberToChineseNumber(testPapersShowInfo.testPaperOrder)}第${arabicNumberToChineseNumber(questionOrder)}题`, '确认'];
      case 'historyTestsShow': return ['', '请选择要查看的测验', '返回'];
      case 'testResults': return ['', '本次测验结果如下', '返回'];
    }
    if (curComponentName === 'testGoing') { // 当处于测验进行页面时
      const { state } = this.props.testGoingComponent;
      const { questionOrder: testingQuestionOrder, examineeId, question } = state;
      if (testingQuestionOrder < 0) return ['', '', ''];
      else if (examineeId && !testingQuestionOrder) return ['', '请等待老师开始测验', ''];
      else if (examineeId && question.questionOrder) return ['', `第${arabicNumberToChineseNumber(testingQuestionOrder)}题`, ''];
      else if (examineeId && !question.questionOrder) return ['', '测验已结束', ''];
      else if (!examineeId && !testingQuestionOrder) return ['结束', '请等待学生加入考试', '开始'];
      else if (!examineeId && question.questionOrder) return ['结束', `第${arabicNumberToChineseNumber(testingQuestionOrder)}题`, '继续'];
      else if (!examineeId && !question.questionOrder) return ['', '测验已结束', '返回'];
    }
    return ['', _1, _2]; // 单纯为处理_1和_2
  }

  throttleSend = throttle(async (event) => {
    const {
      testPapersShowInfo, testPaperQuestionsShowInfo, questionInfo,
      history: { push }, location, showImportantMessage, changeToken
    } = this.props;
    const [_, curComponentName, testPaperId, questionOrder] = location.pathname.split('/');
    if (curComponentName === 'testPapersShow') {
      await axios.post('/admin/auth/logout');
      changeToken('');
      push('/confirmIdentity');
    } else if (curComponentName === 'testPaperQuestionsShow') {
      const { testPaperOrder, lastShowedTestPaperIndex } = testPapersShowInfo;
      push(
        '/testPapersShow',
        lastShowedTestPaperIndex
          ? { testPapersShowInfo }
          : {
              testPapersShowInfo: {
                ...testPapersShowInfo,
                lastShowedTestPaperIndex: testPaperOrder - 1
              }
            }
      );
    } else if (curComponentName === 'questionModify') {
      if (event.target.innerHTML.trim() === '确认') {
        const { name, choices, score, timeLimit, material, answers } = questionInfo;
        const allChoices = new Set(...[choices]);
        // 检查题干
        if (!name) return showImportantMessage('题干不能为空');

        // 检查分值
        else if (!score) return showImportantMessage('分值不能为空');
        else if (isNaN(score)) return showImportantMessage('分值必须为数字');
        else if (score <= 0) return showImportantMessage('分值必须为正数');

        // 检查时限
        else if (!timeLimit) return showImportantMessage('时限不能为空');
        else if (isNaN(timeLimit)) return showImportantMessage('时限必须为数字');
        else if (timeLimit <= 0) return showImportantMessage('时限必须为正数');

        // 检查选项
        else if (choices.filter(e => !e).length) return showImportantMessage('任意选项不能为空');
        else if (allChoices.size !== choices.length) return showImportantMessage('不可有重复选项');

        // 检查答案
        else if (!answers.filter(e => e).length) return showImportantMessage('至少有一个答案');

        // 检查附加材料
        else if (material.category && !material.content) return showImportantMessage('附加材料未添加');

        const testPaperInfo = (await axios.get(`/admin/quiz/${testPaperId}`)).data;
        questionInfo.questionOrder = questionOrder;
        testPaperInfo.questions[questionOrder - 1] = questionInfo;
        await axios.put(`/admin/quiz/${testPaperId}`, testPaperInfo);
        push(
          `/testPaperQuestionsShow/${testPaperId}${
            testPaperQuestionsShowInfo ? '' : '#' + questionOrder
          }`, { testPapersShowInfo, testPaperQuestionsShowInfo }
        );
      } else {
        push(
          `/testPaperQuestionsShow/${testPaperId}`,
          {
            testPapersShowInfo,
            testPaperQuestionsShowInfo: { ...testPaperQuestionsShowInfo, questionOrder }
          }
        );
      }
    } else if (curComponentName === 'testGoing') { // 测验进行页面
      const buttonName = event.target.innerHTML.trim();
      const { testGoingComponent } = this.props;
      const { testPaperId, testId } = testGoingComponent.props.location.state;
      if (buttonName === '开始' || buttonName === '继续') { // 移动至下一题时
        await axios.post(`/admin/quiz/${testPaperId}/advance`); // 让后端开启下一题
        // 获取下一题信息
        const { results } = (await axios.get(`/admin/session/${testId}/status`)).data;
        const { isoTimeLastQuestionStarted, questions, position, players } = results;
        const curQuestion = questions[position] ? questions[position] : {};
        // 发送下一题信息给学生用webSocket。
        const nextQuestion = { isoTimeLastQuestionStarted, ...curQuestion, answers: null };
        testGoingComponent.ws.send(JSON.stringify({ testId, nextQuestion }));
        testGoingComponent.setState({ // 更新老师自己的页面并开启倒计时器
          examinees: players,
          answersShow: false,
          question: curQuestion,
          questionOrder: position + 1,
          questionStartedAt: isoTimeLastQuestionStarted,
          examineeAnswers: new Array(curQuestion.choices ? curQuestion.choices.length : 0).fill(false)
        });
        testGoingComponent.setTimeCountDown();
      } else if (buttonName === '结束') { // 立即结束测验时
        await axios.post(`/admin/quiz/${testPaperId}/end`);
        testGoingComponent.ws.send(JSON.stringify({ testId, nextQuestion: {} }));
        testGoingComponent.setState({ questionOrder: 1, question: {} });
      } else if (buttonName === '返回') push('/testPapersShow'); // 测验结束返回主页面
    } else if (curComponentName === 'testResults') push(`/historyTestsShow/${testPaperId}`);
    else if (curComponentName === 'historyTestsShow') push('/testPapersShow');
    return _; // 单纯为处理_
  })

  checkImportantMessage () {
    if (this.props.importantMessages.length) {
      const { importantMessages } = this.props;
      this.messageDiv.innerHTML = importantMessages[importantMessages.length - 1];
      this.showImportantMessageDiv.style.top = '0px'
    }
  }

  clearImportantMessage = () => {
    this.props.popImportantMessage();
    this.showImportantMessageDiv.style.top = '-500px';
  }

  updateBackgrondPicture = () => {
    const { clientWidth, clientHeight } = document.documentElement;
    const { innerWidth, innerHeight } = window;
    if (clientWidth <= 980) {
      this.setState({ backgroundPictureWidth: clientWidth, backgroundPictureHeight: clientHeight });
    } else this.setState({ backgroundPictureWidth: innerWidth, backgroundPictureHeight: innerHeight });
  }

  componentDidMount () {
    this.setRem();
    setAxiosDefaults(axios, this.props.token);
    axios.interceptors.response.use(...axiosResponseInterceptor(this.props.showImportantMessage));
    window.addEventListener('resize', this.updateBackgrondPicture);
    window.addEventListener('resize', this.setRem);
    this.checkImportantMessage();
  }

  // 每次更新后检查是否有需要展示的重要信息。
  componentDidUpdate () { this.checkImportantMessage(); }

  componentWillUnmount () {
    window.removeEventListener('resize', this.updateBackgrondPicture);
    window.removeEventListener('resize', this.setRem);
  }

  render () {
    const [leftButtonWords, titleWords, rightButtonWords] = this.getHeadWords();
    const { backgroundPictureWidth, backgroundPictureHeight } = this.state;
    return (
      <div>
        {/* 设置视口背景 */}
        <div
          className='background'
          style={{ height: `${backgroundPictureHeight}px`, width: `${backgroundPictureWidth}px` }}
        ></div>

        {/* 设置app头部 */}
        <div className='appHead'>
          {/* 设置左按钮 */}
          <button
            onClick={this.throttleSend}
            style={{ display: leftButtonWords.length ? 'block' : 'none' }}>
            {leftButtonWords}
          </button>

          {/* 设置标题 */}
          <span>{titleWords}</span>

          {/* 设置右按钮 */}
          <button
            onClick={this.throttleSend}
            style={{ display: rightButtonWords.length ? 'block' : 'none' }}>
            {rightButtonWords}
          </button>
        </div>
        <div className='divideLine'></div>

        {/* 设置重要信息提醒窗口 */}
        <div className='showImportantMessage' ref={c => { this.showImportantMessageDiv = c }}>
          <div className='title'>注意</div>
          <div className='divideLine'></div>
          <div ref={c => { this.messageDiv = c; }} className='message'></div>
          <button onClick={this.clearImportantMessage}>确认</button>
        </div>
      </div>
    );
  }
}

export default connect((reduxStore) => ({
  importantMessages: reduxStore.head.importantMessages,
  token: reduxStore.identity.token
}), () => ({ showImportantMessage, changeToken, popImportantMessage }))(withRouter(Head))
