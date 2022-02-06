import { showImportantMessage } from './redux/actionCreators/head';

export function antiShake (fn) {
  let token = null;
  return (...args) => {
    clearTimeout(token);
    token = setTimeout(() => { fn(...args); }, 200);
  }
}

export function throttle (fn) {
  let prove = true;
  return (...args) => {
    if (!prove) return showImportantMessage('不要过度点击');
    prove = false;
    setTimeout(() => { prove = true; fn(...args); }, 500);
  }
}

export function setAxiosDefaults (axios, token = null) {
  axios.defaults.baseURL = 'http://localhost:5005';
  axios.defaults.timeout = 30000;
  axios.defaults.headers = { 'Content-Type': 'application/json', Authorization: token }
}

export function axiosResponseInterceptor (sendImportantMessageFn) {
  return [
    response => response,
    (reason) => {
      if (reason.response) sendImportantMessageFn(reason.response.data.error);
      else sendImportantMessageFn(String(reason));
      return Promise.reject(reason);
    }
  ];
}

export function arabicNumberToChineseNumber (arabicNumber) {
  const chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const chineseDigitCharters = ['', '十', '百', '千', '万'];
  const result = [];
  if (arabicNumber === 0) return chineseNumbers[0];
  let temNumber; let ignoreNumber = true;
  for (let digit = 0; arabicNumber !== 0; digit++) {
    [arabicNumber, temNumber] = [Math.floor(arabicNumber / 10), arabicNumber % 10];
    if (ignoreNumber && temNumber) ignoreNumber = false; // 第一次发现非零位，停止忽略。
    if (ignoreNumber) continue; // 若从此位到个位都是0，无视此位
    result.unshift(`${chineseNumbers[temNumber]}${chineseDigitCharters[digit]}`);
  }
  return result.join('');
}

export function timeStampToString (timeStamp) {
  return `${timeStamp.getFullYear()}年${timeStamp.getMonth() + 1}月${timeStamp.getDate()}日 ` +
    `${timeStamp.getHours()}时${timeStamp.getMinutes()}分${timeStamp.getSeconds()}秒`;
}

export const choiceOrderToLetter = { 0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F' }

export async function checkTestPaperId (axios) {
  const { showImportantMessage, history, location } = this.props;
  const testPaperId = Number(location.pathname.split('/')[2]);
  try {
    if (isNaN(testPaperId)) throw new Error();
    // 获取排序后用户的所有试卷
    const allTestPapers = (await axios.get('admin/quiz')).data.quizzes.sort(
      (a, b) => (new Date(a.createdAt)).getTime() - (new Date(b.createdAt)).getTime()
    );
    let testPaperOrder = 0 // 尝试找到试卷序号
    for (let i = 0; i < allTestPapers.length; i++) {
      if (allTestPapers[i].id === testPaperId) { testPaperOrder = i + 1; break; }
    }
    if (!testPaperOrder) throw new Error();
    else this.setState({ testPaperOrder });
  } catch (error) {
    history.replace('/testPapersShow');
    showImportantMessage('试卷Id必须为有效数字序列');
  }
}
