import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import axios from 'axios'

import Head from '../Head'
import './index.css'
import {
  throttle,
  timeStampToString,
  setAxiosDefaults,
  axiosResponseInterceptor,
  arabicNumberToChineseNumber
} from '../../helperFunctions'
import { showImportantMessage } from '../../redux/actionCreators/head'

class TestPapersShow extends React.Component {
  // 优先利用此组件props里接收到的关于scrollTop和lastShowedTestPaperIndex相关的信息。
  state = {
    testPapers: [],
    testPapersTimeLimitAndScore: new Map(),
    controledTestPaperId: '',
    controledTestPaperOrder: 0,
    modifyingTestPaperName: false,
    lastShowedTestPaperIndex:
      this.props.location.state
        ? this.props.location.state.testPapersShowInfo.lastShowedTestPaperIndex
        : -5
  }

  static propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    token: PropTypes.string.isRequired,
    showImportantMessage: PropTypes.func.isRequired,
  }

  lazyLoad = () => {
    const htmlElement = document.documentElement;
    const { lastShowedTestPaperIndex, testPapers } = this.state;
    if (htmlElement.clientHeight + htmlElement.scrollTop >= htmlElement.scrollHeight &&
      testPapers.length * -1 < lastShowedTestPaperIndex) {
      this.setState({ lastShowedTestPaperIndex: lastShowedTestPaperIndex - 6 });
    }
  }

  // 唤起试卷控制面板
  callControlBoard = (controledTestPaperId, controledTestPaperOrder) => {
    this.setState({ controledTestPaperId: `${controledTestPaperId}`, controledTestPaperOrder });
  }

  // 接受新试卷名，并根据要求创建或更改试卷
  testPaperCreateOrModifyName = (event) => {
    const newTestPaperName = event.target.previousElementSibling.value.trim();
    const { showImportantMessage } = this.props;
    if (!newTestPaperName) return showImportantMessage('新试卷名不能为空！');
    console.log(newTestPaperName, newTestPaperName.length);
    if (newTestPaperName.length > 50) return showImportantMessage('新试卷名不能超过50个字符！');
    this.throttleSend(
      this.state.controledTestPaperId === 'newTestPaper'
        ? 'createNewTestPaper'
        : 'modifyTestPaperName',
      { name: newTestPaperName }, event.target.previousElementSibling
    );
  }

  // 放弃新试卷名，并根据条件返回控制面板或关闭控制面板
  cancelTestPaperCreateOrModifyName = (event) => {
    event.target.parentNode.firstElementChild.value = '';
    const { controledTestPaperId } = this.state;
    if (controledTestPaperId === 'newTestPaper') this.setState({ controledTestPaperId: '' })
    else this.setState({ modifyingTestPaperName: false });
  }

  // 修改试卷题目
  testPaperQuestionModify = () => {
    const testPapersShowInfo = {
      testPapersShowScrollTop: document.documentElement.scrollTop,
      lastShowedTestPaperIndex: this.state.lastShowedTestPaperIndex,
      testPaperOrder: this.state.controledTestPaperOrder
    };
    const { push } = this.props.history;
    push(`/testPaperQuestionsShow/${this.state.controledTestPaperId}`, { testPapersShowInfo });
  }

  showHistoryTests = () => this.props.history.push(`/historyTestsShow/${this.state.controledTestPaperId}`)

  // 节流发送请求
  throttleSend = throttle(async (order, sendInfo, clearValueInput) => {
    if (order === 'startTest') {
      const { testPapers, controledTestPaperOrder } = this.state;
      if (!testPapers[controledTestPaperOrder - 1].active) {
        const testPaper = (await axios.get(`/admin/quiz/${this.state.controledTestPaperId}`)).data;
        if (!testPaper.questions.length) return showImportantMessage('没有题目的试卷不可开始考试');
        await axios.post(`/admin/quiz/${this.state.controledTestPaperId}/start`);
      }
      return this.props.history.push('/testGoing', {
        webSocketOrder: testPapers[controledTestPaperOrder - 1].active ? 'reset' : 'create',
        testPaperId: this.state.controledTestPaperId,
        testId: (await axios.get(`/admin/quiz/${this.state.controledTestPaperId}`)).data.active
      });
    } else if (order === 'createNewTestPaper') await axios.post('/admin/quiz/new', sendInfo);
    else if (order === 'modifyTestPaperName') {
      await axios.put(
        `/admin/quiz/${this.state.controledTestPaperId}`,
        {
          ...(await axios.get(`/admin/quiz/${this.state.controledTestPaperId}`)).data,
          name: sendInfo.name
        }
      )
    } else if (order === 'deleteTestPaper') {
      await axios.delete(`/admin/quiz/${this.state.controledTestPaperId}`);
    }
    if (clearValueInput) clearValueInput.value = '';
    this.setState({
      controledTestPaperId: '',
      controledTestPaperOrder: 0,
      testPapers: (await axios.get('/admin/quiz')).data.quizzes.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
      modifyingTestPaperName: false
    });
  });

  async componentDidMount () {
    const { token, history, showImportantMessage, location } = this.props;
    // 检查组件是否有token
    if (!token) { history.replace('/confirmIdentity'); return showImportantMessage('请先登录'); }

    // 配置axios
    setAxiosDefaults(axios, token);
    axios.interceptors.response.use(...axiosResponseInterceptor(showImportantMessage));

    // 更新testPapers并提示正在进行的测验
    const testPapers = (await axios.get('/admin/quiz')).data.quizzes.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    testPapers.forEach((e, i) => {
      if (e.active) showImportantMessage(`试卷${arabicNumberToChineseNumber(i + 1)}的测验正在进行中`);
    });

    // 防止传来的lastShowedTestPaperIndex为正
    if (this.state.lastShowedTestPaperIndex >= 0) {
      let lastShowedTestPaperIndex = this.state.lastShowedTestPaperIndex - testPapers.length;
      if (lastShowedTestPaperIndex <= -6) {
        lastShowedTestPaperIndex = -(Math.ceil((-lastShowedTestPaperIndex - 5) / 6) * 6 + 5);
      } else lastShowedTestPaperIndex = -5;
      this.setState({ testPapers, lastShowedTestPaperIndex });
    } else this.setState({ testPapers });

    // 更新scrollTop
    if (location.state) {
      const { testPapersShowScrollTop, testPaperOrder } = location.state.testPapersShowInfo;
      if (testPapersShowScrollTop !== undefined) document.documentElement.scrollTop = testPapersShowScrollTop;
      else window.location.hash = `${testPaperOrder}`
    }

    window.addEventListener('scroll', this.lazyLoad);
  }

  componentWillUnmount () { window.removeEventListener('scroll', this.lazyLoad); }

  render () {
    const {
      controledTestPaperId, controledTestPaperOrder,
      testPapers, modifyingTestPaperName
    } = this.state;
    const allNeedShowTestPapers = testPapers.slice(this.state.lastShowedTestPaperIndex);
    return (
      <div>
        <Head/>
        <div className='testPapersBoards'>
          {/* 以下分为两个部分： */}
          {/* testPapersShowBoard用来展示所有试卷。 */}
          <div className='testPapersShowBoard'>
            {/* 创建一个新试卷 */}
            <div
              className='testPaper'
              id='0'
              onClick={() => this.callControlBoard('newTestPaper', 0)}
            >
              <span>点击此处创建一套试卷</span>
            </div>
            {/* 懒加载展示所有已有试卷，从新到旧的顺序 */}
            {allNeedShowTestPapers.reverse().map((testPaperInfo, i) => {
              let allTimeLimit; let allScore;
              const { testPapersTimeLimitAndScore } = this.state;
              if (testPapersTimeLimitAndScore.get(testPaperInfo.id)) {
                [allTimeLimit, allScore] = testPapersTimeLimitAndScore.get(testPaperInfo.id);
              } else if (testPapersTimeLimitAndScore.get(testPaperInfo.id) === undefined) {
                testPapersTimeLimitAndScore.set(testPaperInfo.id, null);
                (async () => {
                  const { data } = (await axios.get(`/admin/quiz/${testPaperInfo.id}`));
                  allTimeLimit = data.questions.reduce((pre, e) => pre + e.timeLimit, 0);
                  allScore = data.questions.reduce((pre, e) => pre + e.score, 0);
                  testPapersTimeLimitAndScore.set(testPaperInfo.id, [allTimeLimit, allScore]);
                  this.setState({ testPapersTimeLimitAndScore });
                })();
              }
              return (
                <div
                  className='testPaper'
                  id={`${testPapers.length - i}`}
                  key={testPaperInfo.id}
                  onClick={() => this.callControlBoard(testPaperInfo.id, testPapers.length - i)}
                >
                  <div className='testPaperTitle'>
                    <div>试卷{arabicNumberToChineseNumber(testPapers.length - i)}</div>
                    <div>总分值: {allScore}分</div>
                    <div>总耗时: {allTimeLimit}分钟</div>
                  </div>
                  <div className='testPaperName'>
                    {testPaperInfo.name}
                  </div>
                  <div className='testPaperComment'>
                    创建于：{timeStampToString(new Date(testPaperInfo.createdAt))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* testPaperControlBoard用来操作试卷 */}
          <div
            className='testPaperControlBoard'
            style={{
              display: controledTestPaperId ? 'block' : 'none',
              height: `${document.documentElement.clientHeight}px`
            }}
          >
            {/* 用于给新试卷命名或给旧试卷改名 */}
            <div
              className='controlNewTestPaperOrModifyName'
              style={{
                display:
                  controledTestPaperId === 'newTestPaper' || modifyingTestPaperName
                    ? 'flex'
                    : 'none'
              }}
            >
              <input
                type="text"
                placeholder={modifyingTestPaperName ? '请输入新的试卷名称' : '请输入新试卷的名字'}
              />
              <button onClick={this.testPaperCreateOrModifyName}>确认</button>
              <button onClick={this.cancelTestPaperCreateOrModifyName}>返回</button>
            </div>
            {/* 用于操作旧试卷 */}
            <div
              className='controlOldTestPaper'
              style={{
                display:
                  controledTestPaperId !== 'newTestPaper' && !modifyingTestPaperName
                    ? 'flex'
                    : 'none'
              }}
            >
              <button onClick={() => this.throttleSend('startTest')}>
                {
                  testPapers.length && controledTestPaperOrder &&
                    testPapers[controledTestPaperOrder - 1].active
                    ? '返回测试现场'
                    : '用该套试卷开始测试'
                }
              </button>
              <button onClick={() => this.setState({ modifyingTestPaperName: true })}>修改试卷名称</button>
              <button onClick={this.testPaperQuestionModify}>修改试卷题目</button>
              <button onClick={this.showHistoryTests}>查看跟该试卷相关的测验历史</button>
              <button onClick={() => this.throttleSend('deleteTestPaper')}>删除试卷</button>
              <button onClick={() => this.setState({ controledTestPaperId: '' })}>返回</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(
  (reduxStore) => ({ token: reduxStore.identity.token }),
  () => ({ showImportantMessage }))(TestPapersShow);
