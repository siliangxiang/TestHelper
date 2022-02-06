import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import axios from 'axios';
import * as echarts from 'echarts';

import './index.css';
import Head from '../Head';
import { setAxiosDefaults, axiosResponseInterceptor } from '../../helperFunctions';
import { showImportantMessage } from '../../redux/actionCreators/head';

class TestResults extends Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    match: PropTypes.object.isRequired,
    token: PropTypes.string.isRequired,
    showImportantMessage: PropTypes.func.isRequired
  }

  state = {
    noExaminees: false,
    showRange: true,
    range: [], // 包含单人的总分数, 总耗时. 从第一名排到最后一名
    allExamineesAverageScore: 0,
    allExamineesAverageTimeCost: 0,
    eachQuestionCorrectRate: [],
    eachQuestionAverageTimeCost: []
  }

  async componentDidMount () {
    const {
      token, showImportantMessage,
      history: { replace }, match: { params: { testId, testPaperId } }
    } = this.props;
    // 没有合法token先登录
    if (!token) { replace('/confirmIdentity'); return showImportantMessage('请先登录'); }
    setAxiosDefaults(axios, token); // 设置axios默认选项和相应拦截器
    axios.interceptors.response.use(...axiosResponseInterceptor(showImportantMessage));
    let rawResults, rawQuestions; // 获取原始测验数据和原始试卷信息
    try { // 测验Id或试卷Id有任意一个不对则返回试卷展示页面
      rawResults = (await axios.get(`/admin/session/${testId}/results`)).data.results;
      rawQuestions = (await axios.get(`/admin/quiz/${testPaperId}`)).data.questions;
    } catch (error) { return replace('/testPapersShow') }
    if (!rawResults.length) return this.setState({ noExaminees: true }); // 无考生参加
    const range = rawResults.map(examineeResults => [ // 统计学生的排名, 包含每人的分数和耗时
      examineeResults.name,
      ...examineeResults.answers.reduce((pre, result, i) => [
        result.correct ? pre[0] + rawQuestions[i].score : pre[0],
        pre[1] + (new Date(result.answeredAt) - new Date(result.questionStartedAt)) // 耗时为毫秒
      ], [0, 0])
    ]).sort((a, b) => b[1] - a[1] ? b[1] - a[1] : a[2] - b[2]);
    const allAvgInfo = range.reduce((pre, e) => // 利用排名统计总平均分和总耗时(毫秒)
      [pre[0] + e[1], pre[1] + e[2]]
    , [0, 0]).map(e => Math.round(e / range.length));
    const [allExamineesAverageScore, allExamineesAverageTimeCost] = allAvgInfo;
    const eachQuestionInfo = rawQuestions.map((_, questionI) => // 统计每个问题的信息
      rawResults.reduce((pre, e) => [
        e.answers[questionI].correct ? pre[0] + 1 : pre[0],
        pre[1] + (new Date(e.answers[questionI].answeredAt) - new Date(e.answers[questionI].questionStartedAt))
      ], [0, 0]).map(e => e / rawResults.length) // 正确率为小数
    );
    const eachQuestionCorrectRate = eachQuestionInfo.map(e => e[0]);
    const eachQuestionAverageTimeCost = eachQuestionInfo.map(e => Math.round(e[1] / 600) / 100);
    const correctGraph = echarts.init(this.eachQuestionCorrectRateBarGraph) // 画正确率柱状图
    correctGraph.setOption({
      title: { text: '每题正确率' },
      tooltip: {},
      // legend: { data: ['正确率'] },
      xAxis: { max: 1 },
      yAxis: { data: eachQuestionCorrectRate.map((_, i) => `第${i + 1}题`).reverse() },
      series: [{
        name: '正确率',
        type: 'bar',
        data: eachQuestionCorrectRate.reverse(),
        barWidth: '30px'
      }]
    });
    correctGraph.resize({ height: `${60 * rawQuestions.length + 130}px` });
    const timeCostGraph = echarts.init(this.eachQuestionAvgTimeCostBarGraph); // 画耗时柱状图
    timeCostGraph.setOption({
      title: { text: '每题平均花费时间（单位：分钟）' },
      tooltip: {},
      // legend: { data: ['平均花费时间（单位：分钟）'] },
      xAxis: {},
      yAxis: { data: eachQuestionAverageTimeCost.map((_, i) => `第${i + 1}题`).reverse() },
      series: [{
        name: '平均花费时间（单位：分钟）',
        type: 'bar',
        barWidth: '30px',
        data: eachQuestionAverageTimeCost.reverse()
      }]
    })
    timeCostGraph.resize({ height: `${60 * rawQuestions.length + 130}px` });
    this.setState({ // 更新
      range,
      allExamineesAverageScore,
      allExamineesAverageTimeCost,
      eachQuestionCorrectRate,
      eachQuestionAverageTimeCost
    });
  }

  render () {
    const {
      showRange, range, noExaminees,
      allExamineesAverageScore, allExamineesAverageTimeCost
    } = this.state;
    return (
      <div>
        <Head/>
        <div className='testResults'>
          {/* 头部 */}
          <div
            className="head"
            onClick={e => this.setState({ showRange: e.target.innerHTML === '排名' })}
          >
            <div
              style={{
                backgroundColor: showRange ? 'black' : 'white',
                color: showRange ? 'white' : 'black'
              }}
            >排名</div>
            <div
              style={{
                backgroundColor: showRange ? 'white' : 'black',
                color: showRange ? 'black' : 'white'
              }}
            >单题统计</div>
          </div>
          {/* 无人参加 */}
          <div className='noExaminees' style={{ display: noExaminees ? 'block' : 'none' }}>
            本次测验无人参加
          </div>
          {/* 所有人排名 */}
          <div
            className="range"
            style={{ display: showRange && range.length ? 'block' : 'none' }}
          >
            <div>
              {`所有考生平均分为${allExamineesAverageScore}，`}
              {`均所用时间为${Math.floor(allExamineesAverageTimeCost / 60000)}分`}
              {`${allExamineesAverageTimeCost % 60000 / 1000}秒`}
            </div>
            {range.map((e, i) => (
              <div className="eachPerson" key={i}>
                <div className="order">{`第${i + 1}名：`}</div>
                <div className="name">{`${e[0]}`}</div>
                <div className="score">{`${e[1]}分`}</div>
                <div className="timeCost">
                  {`用时${Math.floor(e[2] / 60000)}分${e[2] % 60000 / 1000}秒`}
                </div>
              </div>
            ))}
          </div>
          {/* 两个柱状图：每题正确率和平均耗时 */}
          <div
            className="eachQuestionInfo"
            style={{ display: showRange && range ? 'none' : 'block' }}
          >
            <div ref={e => { this.eachQuestionCorrectRateBarGraph = e }}></div>
            <div ref={e => { this.eachQuestionAvgTimeCostBarGraph = e }}></div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(
  reduxStore => ({ token: reduxStore.identity.token }),
  () => ({ showImportantMessage }))(TestResults);
