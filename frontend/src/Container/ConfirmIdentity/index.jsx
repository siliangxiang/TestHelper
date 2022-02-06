import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import axios from 'axios'

import Head from '../Head'
import './index.css'
import {
  throttle,
  setAxiosDefaults,
  axiosResponseInterceptor
} from '../../helperFunctions'
import { changeToken } from '../../redux/actionCreators/identity'
import { showImportantMessage } from '../../redux/actionCreators/head'

class Identity extends React.Component {
  static propTypes = {
    history: PropTypes.object.isRequired,
    changeToken: PropTypes.func.isRequired,
    showImportantMessage: PropTypes.func.isRequired
  }

  state = { teacherIdentity: true, prepareLogin: true }

  changeUserIdentity = (event) => {
    const buttonName = event.target.innerHTML.trim();
    const { teacherIdentity } = this.state;
    if (buttonName === '我是老师' && !teacherIdentity) {
      [...this.studentForm.children].forEach(e => { e.value = '' });
    } else if (buttonName === '我是学生' && teacherIdentity) {
      [...this.teacherForm.children].forEach(e => { e.value = '' });
    }
    this.setState({ teacherIdentity: buttonName === '我是老师' });
  }

  changeBetweenLoginAndRegister = () => {
    [...this.teacherForm.children].forEach(e => { e.value = '' });
    this.setState({ prepareLogin: !this.state.prepareLogin })
  }

  identityCheck = (event) => {
    const { showImportantMessage } = this.props;
    const inputs = [...event.target.parentNode.children].map(e => e.value.trim());
    if (!this.state.teacherIdentity) {
      if (!inputs[0]) return showImportantMessage('测验Id不能为空！');
      if (!/^[0-9]{1,}$/.test(inputs[0])) return showImportantMessage('必须输入有效测验ID！');
      if (!inputs[1]) return showImportantMessage('姓名不能为空！');
    } else {
      if (!inputs[0]) return showImportantMessage('email输入不能为空！');
      if (!(/\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/.test(inputs[0]))) {
        return showImportantMessage('必须输入有效email！');
      }
      if (!inputs[1]) return showImportantMessage('密码输入不能为空！');
      if (!this.state.prepareLogin && inputs[1] !== inputs[2]) {
        return showImportantMessage('两次输入的密码不一致，请重新输入！');
      }
    }
    this.throttleSend(inputs);
  }

  throttleSend = throttle(async (inputs) => {
    let response;
    if (this.state.teacherIdentity) {
      response = await axios.post(
        `/admin/auth/${this.state.prepareLogin ? 'login' : 'register'}`,
        { email: inputs[0], password: inputs[1] }
      );
    } else response = await axios.post(`/play/join/${inputs[0]}`, { name: inputs[1] });
    if (this.state.teacherIdentity) {
      this.props.changeToken(response.data.token);
      this.props.history.push('/testPapersShow');
    } else {
      this.props.history.push(
        `/testGoing/${response.data.playerId}`,
        { examineeName: inputs[1], testId: inputs[0] }
      )
    }
  });

  componentDidMount () {
    setAxiosDefaults(axios);
    axios.interceptors.response.use(...axiosResponseInterceptor(this.props.showImportantMessage));
  }

  render () {
    const { teacherIdentity, prepareLogin } = this.state;
    return (
      <div>
        <Head/>
        <div className='userInfo'>
          {/* 切换登陆身份（老师身份或学生身份） */}
          <div className='changeUserIdentity' onClick={this.changeUserIdentity}>
            <div
              className='noBorderRadius'
              style={{
                backgroundColor: teacherIdentity ? 'black' : 'transparent',
                color: teacherIdentity ? 'white' : 'black'
              }}
            >我是老师</div>
            <div
              className='noBorderRadius'
              style={{
                backgroundColor: teacherIdentity ? 'transparent' : 'black',
                color: teacherIdentity ? 'black' : 'white'
              }}
            >我是学生</div>
          </div>
          {/* 老师登陆所用表单 */}
          <div
            className='form' ref={c => { this.teacherForm = c }}
            style={{ display: teacherIdentity ? 'flex' : 'none' }}
          >
            <input type="text" placeholder='请输入你的email'/>
            <input type="password" placeholder='请输入你的密码'/>
            <input type="password" placeholder='请再次输入你的密码'
              style={{ display: prepareLogin ? 'none' : 'block' }}
            />
            <button onClick={this.identityCheck}>{prepareLogin ? '登录' : '注册'}</button>
          </div>
          {/* 学生登陆所用表单 */}
          <div className='form' ref={c => { this.studentForm = c }}
            style={{ display: teacherIdentity ? 'none' : 'flex' }}
          >
            <input type='text' placeholder='请输入测验id'/>
            <input type='text' placeholder='请输入你的姓名'/>
            <button onClick={this.identityCheck}>加入</button>
          </div>
          {/* 当处于老师身份时，在登录和注册之间切换 */}
          <div className='comment'>
            <span style={{ display: teacherIdentity ? 'inline' : 'none' }}>
              如果您
              {prepareLogin ? '没' : '已'}
              有账户，请点击
              <span onClick={this.changeBetweenLoginAndRegister}>
                这里
              </span>
              {prepareLogin ? '注册' : '登录'}。
            </span>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(() => ({}), () => ({ changeToken, showImportantMessage }))(Identity);
