import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import axios from 'axios'

import Head from '../Head'
import './index.css'
import {
  choiceOrderToLetter, setAxiosDefaults,
  axiosResponseInterceptor, checkTestPaperId
} from '../../helperFunctions'
import { showImportantMessage } from '../../redux/actionCreators/head'

class QuestionModify extends Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    token: PropTypes.string.isRequired,
    showImportantMessage: PropTypes.func.isRequired,
  }

  state = {
    testPaperOrder: 0,
    showQuestionProperties: true,
    questionInfo: {
      score: '',
      timeLimit: '',
      material: { category: '', content: '' },
      name: '',
      choices: new Array(4).fill(''),
      answers: new Array(4).fill(false)
    }
  }

  // 改变要更改的部分（题目属性或题干和选项）
  changeModifyPart = (event) => {
    this.setState({ showQuestionProperties: event.target.innerHTML.trim() === '题目属性' });
  }

  updateQuestionInfo = (event) => {
    const { name, checked, files } = event.target;
    const value = event.target.value.trim();
    const { questionInfo } = this.state;
    const choiceOrder = event.target.getAttribute('order');
    if (name === 'nChoices') {
      for (let oldNChoices = questionInfo.answers.length; oldNChoices < +value; oldNChoices++) {
        questionInfo.choices.push(''); questionInfo.answers.push(false);
      }
      questionInfo.answers.length = questionInfo.choices.length = +value;
    } else if (name === 'materialCategory') {
      questionInfo.material.category = value;
      questionInfo.material.content = '';
    } else if (name === 'answer') questionInfo.answers[choiceOrder] = checked;
    else if (name === 'choice') questionInfo.choices[choiceOrder] = value.trim();
    else if (name === 'pictureInput') {
      const reader = new FileReader();
      reader.onload = e => {
        const { result } = e.target;
        if (result.indexOf('img') > -1 || result.indexOf('imag') > -1) {
          questionInfo.material.content = e.target.result;
        } else return showImportantMessage('请选择图片文件');
        this.setState({ questionInfo });
      }
      return reader.readAsDataURL(files[0]);
    } else if (name === 'videoIframe') {
      if (/^<iframe(.{1,})<\/iframe>$/.test(value.trim())) {
        questionInfo.material.content = value;
        this.videoPreShow.innerHTML = value;
      } else return showImportantMessage('请输入合法的视频分享代码');
    } else if (name === 'name') questionInfo[name] = value;
    else questionInfo[name] = +value;
    this.setState({ questionInfo });
  }

  updateDefault (questionInfo) {
    this.nChoicesSelect.value = `${questionInfo.choices.length}`;
    this.materialCategorySelect.value = `${questionInfo.material.category}`;
    [...this.allAnswersFather.children].forEach((e, i) => {
      if (!i) return;
      e.lastElementChild.defaultChecked = questionInfo.answers[i - 1];
    });
    if (questionInfo.material.category === 'video') {
      this.videoPreShow.innerHTML = questionInfo.material.content;
    }
  }

  async componentDidMount () {
    const { token, showImportantMessage, history, location } = this.props;
    const { state: { testPapersShowInfo, testPaperQuestionsShowInfo } } = location;
    let [_1, _2, testPaperId, questionOrder] = location.pathname.split('/');
    setAxiosDefaults(axios, token);
    axios.interceptors.response.use(...axiosResponseInterceptor(showImportantMessage));
    if (!token) { history.replace('/confirmIdentity'); return showImportantMessage('请先登录'); }
    if (!testPapersShowInfo) {
      checkTestPaperId.call(this, axios);
      // 判断题目序号是否有效。
      try {
        questionOrder = Number(questionOrder);
        if (isNaN(questionOrder) || questionOrder < 1 ||
          parseInt(questionOrder) !== questionOrder) throw new Error();
        const allQuestions = (await axios.get(`admin/quiz/${testPaperId}`)).data.questions;
        if (questionOrder > allQuestions.length + 1) throw new Error();
        else if (questionOrder < allQuestions.length + 1) {
          this.setState({ questionInfo: allQuestions[questionOrder - 1] });
          this.updateDefault(allQuestions[questionOrder - 1]);
        }
      } catch (error) {
        history.replace(`/testPaperQuestionsShow/${testPaperId}`);
        showImportantMessage('题目序号必须为有效数字');
      }
    } else {
      const { questionInfo } = testPaperQuestionsShowInfo;
      !questionInfo
        ? this.setState({ testPaperOrder: testPapersShowInfo.testPaperOrder })
        : this.setState({
          testPaperOrder: testPapersShowInfo.testPaperOrder, questionInfo
        });
      if (questionInfo) this.updateDefault(questionInfo);
    }
    // 单纯为处理_1和_2
    return [_1, _2];
  }

  render () {
    const {
      testPaperOrder, showQuestionProperties, questionInfo,
      questionInfo: { score, timeLimit, material, name, choices }
    } = this.state;
    if (!this.props.location.state) this.props.location.state = {};
    let { testPapersShowInfo, testPaperQuestionsShowInfo } = this.props.location.state;
    testPapersShowInfo = { ...testPapersShowInfo, testPaperOrder }
    const toHead = { testPapersShowInfo, testPaperQuestionsShowInfo, questionInfo };
    return (
      <div>
        <Head {...toHead}/>
        <div className='questionDetails' onInput={this.updateQuestionInfo}>
          {/* 在更改问题属性和问题的题目和选项之间切换 */}
          <div
            className='head'
            onClick={this.changeModifyPart}
          >
            <div
              className='noBorderRadius'
              style={{
                backgroundColor: showQuestionProperties ? 'black' : 'white',
                color: showQuestionProperties ? 'white' : 'black'
              }}
            >题目属性</div>
            <div
              className='noBorderRadius'
              style={{
                backgroundColor: showQuestionProperties ? 'white' : 'black',
                color: showQuestionProperties ? 'black' : 'white'
              }}
            >题干与选项</div>
          </div>

          {/* 用于修改问题属性的面板 */}
          <div
            className='questionProperties'
            style={{ display: showQuestionProperties ? 'flex' : 'none' }}
          >
            <div>
              <div className='title'>分值：</div>
              <div>
                <input name='score' type="text" defaultValue={score}/>
              </div>
            </div>
            <div>
              <div className='title'>时间限制（单位/分）：</div>
              <div>
                <input type="text" name='timeLimit' defaultValue={timeLimit}/>
              </div>
            </div>
            <div>
              <div className='title'>选项个数：</div>
              <div>
                <select
                  name='nChoices'
                  ref={c => { this.nChoicesSelect = c }}
                  defaultValue={choices.length}
                >
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
            </div>
            <div>
              <div className='title'>附加材料：</div>
              <div>
                <select
                  name='materialCategory'
                  ref={c => { this.materialCategorySelect = c }}
                  defaultValue={material.category}
                >
                  <option value="picture">图片</option>
                  <option value="video">视频</option>
                  <option value="">无</option>
                </select>
              </div>
            </div>
          </div>

          {/* 用于修改问题题干和选项的面板 */}
          <div
            className='questionContent'
            style={{ display: showQuestionProperties ? 'none' : 'block' }}
          >
            <div className='clearfix'>
              <div className='title'>题目内容：</div>
              <textarea className='questionBody' name="name" defaultValue={name}></textarea>
            </div>

            <div
              className='materialContent'
              style={{ display: material.category ? 'flex' : 'none' }}
            >
              <div className='title'>
                {material.category === 'picture' ? '请上传附加图片' : '请输入附加视频的分享代码'}
              </div>
              {/* 用于添加附加图片 */}
              <div
                className='addPicture'
                style={{ display: material.category === 'picture' ? 'flex' : 'none' }}
              >
                <div style={{ backgroundImage: `url(${material.content})` }}></div>
                <div>
                  <div>请选择图片</div>
                  <input name='pictureInput' type="file" />
                </div>
              </div>

              {/* 用于添加附加视频 */}
              <div
                className='addVideo'
                style={{ display: material.category === 'picture' ? 'none' : 'flex' }}
              >
                <div ref={c => { this.videoPreShow = c }}></div>
                <input
                  name='videoIframe'
                  type="text"
                  defaultValue={material.category === 'video' ? material.content : ''}
                  placeholder='在此输入分享代码（点击网络视频的分享->嵌入代码）'
                />
              </div>
            </div>

            <div ref={c => { this.allAnswersFather = c; }}>
              <div
                className='title'
                style={{ marginTop: material.category ? '0px' : '30px' }}
              >请输入各个选项内容，并在正确选项后打勾</div>
              {choices.map((e, i) => (
                <div className='choice' key={i}>
                  <span>{`${choiceOrderToLetter[i]}.`}</span>
                  <input name='choice' order={i} type="text" defaultValue={e}/>
                  <input name='answer' order={i} type="checkbox"/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  (reduxStore) => ({ token: reduxStore.identity.token }),
  () => ({ showImportantMessage }))(withRouter(QuestionModify));
