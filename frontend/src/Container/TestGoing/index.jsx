import React, { Component } from 'react';
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import axios from 'axios'

import './index.css'
import Head from '../Head'
import { showImportantMessage } from '../../redux/actionCreators/head'
import { setAxiosDefaults, axiosResponseInterceptor, choiceOrderToLetter } from '../../helperFunctions'

class TestGoing extends Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    token: PropTypes.string.isRequired,
    showImportantMessage: PropTypes.func.isRequired
  }

  state = {
    // 需要更新部分
    questionOrder: -1, // 区分测验的准备（-1）和结束（正数）。不同于后端的position（question的index）
    question: {},
    questionStartedAt: null,
    examineeAnswers: [], // 重置长度
    examinees: [],
    correctAnswers: [], // 结束后更新
    // 需要重置部分
    answersShow: false,
    // 无需更新部分
    timeRemain: null, // 毫秒为单位
    examineeId: this.props.location.pathname.split('/')[2]
  }

  async inputAnswer (choiceIndex, event) {
    const { examineeAnswers, examineeId } = this.state; // 修改答案
    examineeAnswers[choiceIndex] = event.target.checked;
    this.setState({ examineeAnswers });
    // 把答案转为答案id并提交
    const answerIds = examineeAnswers.map((e, i) => e ? i : null);
    await axios.put(`/play/${examineeId}/answer`, { answerIds });
  }

  // 问题信息更新后，设置倒计时和是否显示答案
  async setTimeCountDown () {
    clearInterval(this.timeCountDown); // 清空之前的计时器
    const { questionOrder, question, questionStartedAt, examineeId } = this.state;
    if (!(questionOrder > 0 && question.questionOrder)) return; // 测验准备和已结束不设置倒计时
    const hasUsedTime = (new Date() - new Date(questionStartedAt)); // 已用时
    let timeRemain = Math.max(question.timeLimit * 60000 - hasUsedTime, 0); // 剩余时间
    this.setState({ timeRemain, answersShow: !timeRemain }); // 更新剩余时间
    if (!timeRemain) { // 没有剩余时间展示答案
      // 身份为老师则无需索要答案
      if (!examineeId) return this.setState({ correctAnswers: this.state.question.answers });
      const { answerIds } = (await axios.get(`/play/${examineeId}/answer`)).data;
      this.setState({ correctAnswers: answerIds.map(e => e !== null) })
    } else { // 有剩余时间设置倒计时
      this.timeCountDown = setInterval(async () => { // 定义每1秒更新一次的剩余时间更新函数
        timeRemain = Math.max(timeRemain - 1000, 0);
        // 倒计时为0展示答案，清除timeInterval。否则更新新的剩余时间。
        if (timeRemain) this.setState({ timeRemain });
        else {
          clearInterval(this.timeCountDown);
          this.setState({ timeRemain, answersShow: true });
          // 身份为老师则无需索要答案
          if (!examineeId) return this.setState({ correctAnswers: this.state.question.answers });
          const { answerIds } = (await axios.get(`/play/${examineeId}/answer`)).data;
          this.setState({ correctAnswers: answerIds.map(e => e !== null) })
        }
      }, 1000);
    }
  }

  // 页面加载完毕后后开启
  startWebSocket () {
    this.ws = new WebSocket('ws://localhost:5006/');
    const { testPaperId, testId, examineeName, webSocketOrder } = this.props.location.state;
    this.ws.onopen = () => { // 建立webSocket
      if (testPaperId) {
        this.ws.send(JSON.stringify({ testPaperId, testId, webSocketOrder }));
        if (webSocketOrder === 'create') this.props.location.state.webSocketOrder = 'reset';
      } else this.ws.send(JSON.stringify({ testId, examineeName, examineeId: this.state.examineeId }));
    }
    this.ws.onmessage = async response => { // 收到服务器webSocket消息
      const { questionOrder, examinees } = this.state;
      if (testPaperId && !questionOrder) { // 当用户身份为老师且处于测验准备阶段时
        const { players } = (await axios.get(`/admin/session/${testId}/status`)).data.results;
        if (players.length !== examinees.length) this.setState({ examinees: [...examinees, response.data] });
      } else if (!testPaperId) { // 当用户身份为学生时更新（websocket传来的信息应跟express传来的一样）
        const question = JSON.parse(response.data);
        const { isoTimeLastQuestionStarted: questionStartedAt, choices } = question;
        const questionOrder = question.questionOrder ? question.questionOrder : 1;
        const examineeAnswers = new Array(choices ? choices.length : 0).fill(false);
        this.setState({ questionOrder, question, answersShow: false, questionStartedAt, examineeAnswers });
        this.setTimeCountDown(); // 更新完开启倒计时。
      }
    }
  }

  // 展示测验结果
  showResults = () => {
    const { history: { push }, location: { state } } = this.props;
    if (state) push(`/testResults/${state.testPaperId}/${state.testId}`);
  }

  async componentDidMount () {
    const { examineeId } = this.state;
    const { token, showImportantMessage, history: { replace }, location: { state } } = this.props;
    const [testPaperId, testId] = state ? [state.testPaperId, state.testId] : [null, null];
    // 设置axios默认值和响应拦截器
    setAxiosDefaults(axios, token);
    axios.interceptors.response.use(...axiosResponseInterceptor(showImportantMessage));
    if (!examineeId && !testPaperId) { // 当身份为老师时保证该页面有合法的testId和testPaperId值
      replace('/testPapersShow');
      showImportantMessage('请先选择在测验中使用的试卷再点击开始测验按钮或返回测验按钮');
    } else if (!examineeId && testPaperId) { // 在正常以教师身份进入该页面后开启webSocket并更新。
      this.startWebSocket();
      const testInfo = (await axios.get(`/admin/session/${testId}/status`)).data.results;
      const { position, questions, players, isoTimeLastQuestionStarted, active } = testInfo;
      const curQuestion = questions[position] && active ? questions[position] : {};
      this.setState({ // 更新老师自己的页面并开启倒计时器
        examinees: players,
        answersShow: false,
        question: curQuestion,
        questionOrder: active ? position + 1 : 1,
        questionStartedAt: isoTimeLastQuestionStarted,
        examineeAnswers: new Array(curQuestion.choices ? curQuestion.choices.length : 0).fill(false)
      });
      this.setTimeCountDown();
    } else { // 当身份为学生时，尝试返回考试页面，若考号不对则报错后返回身份确认界面
      try {
        // 判断测验是否开始并建立websocket
        const { started } = (await axios.get(`/play/${examineeId}/status`)).data;
        this.startWebSocket();
        if (!started) return this.setState({ questionOrder: 0 }); // 测验未开始的更新
        // 测验已开始，尝试获取当前题目
        const { question } = (await axios.get(`/play/${examineeId}/question`)).data;
        if (this.state.questionOrder >= 0) return; // 若有来自webSocket的更新则终止，否则立即更新
        const { isoTimeLastQuestionStarted: questionStartedAt, choices } = question;
        const questionOrder = question.questionOrder ? question.questionOrder : 1;
        const examineeAnswers = new Array(choices ? choices.length : 0).fill(false);
        this.setState({ questionOrder, question, questionStartedAt, examineeAnswers });
        this.setTimeCountDown(); // 更新完开启倒计时。
      } catch (error) { replace('/confirmIdentity'); showImportantMessage('考号无效'); }
    }
  }

  componentDidUpdate () {
    if (!this.state.question.material) return;
    const { category, content } = this.state.question.material;
    if (category === 'video') this.materialShow.innerHTML = content;
  }

  componentWillUnmount () { clearInterval(this.timeCountDown); if (this.ws) this.ws.close(); }

  render () {
    const {
      questionOrder, examineeId, examinees,
      question, timeRemain, answersShow, correctAnswers,
    } = this.state;
    const { material, answers, choices, name, score } = question;
    const testId = this.props.location.state ? this.props.location.state.testId : null;
    return (
      <div>
        <Head testGoingComponent={this} testGoingComponentState={{ ...this.state }} />
        {/* 老师和学生的测验准备样式 */}
        <div
          className='teacherPrepare'
          style={{ display: !examineeId && !questionOrder ? 'block' : 'none' }}
        >
          <div>本次测验的测验Id为：<span>{testId}</span>，目前参加的考生有：</div>
          <div>{examinees.join('，')}</div>
        </div>
        <div
          className='studentPrepare'
          style={{ display: examineeId && !questionOrder ? 'block' : 'none' }}
        ></div>
        {/* 测验进行中时展示的 */}
        <div
          className='testGoing'
          style={{ display: questionOrder > 0 && question.questionOrder ? 'block' : 'none' }}
        >
          {/* 题干 */}
          <div className='name'>
            {name}
            <span>
              {`（分值：${score} `}
              {answersShow
                ? '倒计时结束，本题答案为：' +
                  correctAnswers.map((e, i) => e ? choiceOrderToLetter[i] : '').join('') + '）'
                : `剩余时间：${Math.floor(timeRemain / 60000)}分` +
                  `${Math.floor(timeRemain % 60000 / 1000)}秒）`}
            </span>
          </div>
          {/* 辅助材料 */}
          <div
            ref={c => { this.materialShow = c }}
            className='material'
            style={{
              display: material && material.category ? 'block' : 'none',
              backgroundImage: material && material.category === 'picture' ? `url(${material.content})` : 'none'
            }}
          ></div>
          {/* 选项 */}
          <div className='choices clearfix'>
            {choices
              ? choices.map((e, i) => (
                  <div className='choice' key={`${questionOrder}_${i}`}>
                    <span>{`${choiceOrderToLetter[i]}.`}</span>
                    <div>{e}</div>
                    {examineeId
                      ? <input
                          type="checkbox" disabled={answersShow}
                          onInput={e => this.inputAnswer(i, e)}
                        />
                      : <input type="checkbox" disabled={true} defaultChecked={answers[i]}/>
                    }
                  </div>
                ))
              : ''}
          </div>
        </div>
        {/* 测验结束。标志：questionOrder大于0，但question为空对象 */}
        <div
          className='testEnd'
          style={{ display: questionOrder > 0 && !question.questionOrder ? 'flex' : 'none' }}
        >
          {examineeId
            ? <span>测验已结束，请查看老师屏幕了解自己的排名。</span>
            : <span>测验已结束，点击<span onClick={this.showResults}>这里</span>查看统计数据。
              </span>}
        </div>
      </div>
    )
  }
}

export default connect(
  (reduxStore) => ({ token: reduxStore.identity.token }),
  () => ({ showImportantMessage }))(TestGoing);
