// rest风格api
// nodejs的内置文件模块。
import fs from 'fs';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
// 解析请求体。
import bodyParser from 'body-parser';
import cors from 'cors';

import ws from 'nodejs-websocket'
import { InputError, AccessError, } from './error';
import swaggerDocument from '../swagger.json';
import {
  getEmailFromAuthorization,
  login,
  logout,
  register,
  save,
  getQuizzesFromAdmin,
  addQuiz,
  startQuiz,
  endQuiz,
  submitAnswers,
  getResults,
  assertOwnsQuiz,
  getQuiz,
  playerJoin,
  updateQuiz,
  sessionStatus,
  assertOwnsSession,
  removeQuiz,
  sessionResults,
  advanceQuiz,
  getQuestion,
  getAnswers,
  hasStarted,
} from './service';

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(bodyParser.json({ limit: '50mb', }));

const catchErrors = fn => async (req, res) => {
  try {
    await fn(req, res);
    save();
  } catch (err) {
    if (err instanceof InputError) {
      res.status(400).send({ error: err.message, });
    } else if (err instanceof AccessError) {
      res.status(403).send({ error: err.message, });
    } else {
      console.log(err);
      res.status(500).send({ error: 'A system error ocurred', });
    }
  }
};

/***************************************************************
                       Auth Functions
***************************************************************/

const authed = fn => async (req, res) => {
  const email = getEmailFromAuthorization(req.header('Authorization'));
  await fn(req, res, email);
}; 

app.post('/admin/auth/login', catchErrors(async (req, res) => {
  const { email, password, } = req.body;
  const token = await login(email, password);
  return res.json({ token, });
}));

app.post('/admin/auth/register', catchErrors(async (req, res) => {
  const { email, password, name, } = req.body;
  const token = await register(email, password, name);
  return res.json({ token, });
}));

app.post('/admin/auth/logout', catchErrors(authed(async (req, res, email) => {
  await logout(email);
  return res.json({});
})));

/***************************************************************
                       Quiz Functions
***************************************************************/

app.get('/admin/quiz', catchErrors(authed(async (req, res, email) => {
  return res.json({ quizzes: await getQuizzesFromAdmin(email), });
})));

app.post('/admin/quiz/new', catchErrors(authed(async (req, res, email) => {
  return res.json({ quizId: await addQuiz(req.body.name, email), });
})));

app.get('/admin/quiz/:quizid', catchErrors(authed(async (req, res, email) => {
  const { quizid, } = req.params;
  await assertOwnsQuiz(email, quizid);
  return res.json(await getQuiz(quizid));
})));

app.put('/admin/quiz/:quizid', catchErrors(authed(async (req, res, email) => {
  const { quizid, } = req.params;
  const { questions, name, thumbnail, } = req.body;
  await assertOwnsQuiz(email, quizid);
  await updateQuiz(quizid, questions, name, thumbnail);
  return res.status(200).send({});
})));

app.delete('/admin/quiz/:quizid', catchErrors(authed(async (req, res, email) => {
  const { quizid, } = req.params;
  await assertOwnsQuiz(email, quizid);
  await removeQuiz(quizid);
  return res.status(200).send({});
})));

app.post('/admin/quiz/:quizid/start', catchErrors(authed(async (req, res, email) => {
  const { quizid, } = req.params;
  await assertOwnsQuiz(email, quizid);
  await startQuiz(quizid);
  return res.status(200).json({});
})));

app.post('/admin/quiz/:quizid/advance', catchErrors(authed(async (req, res, email) => {
  const { quizid, } = req.params;
  await assertOwnsQuiz(email, quizid);
  const stage = await advanceQuiz(quizid);
  return res.status(200).json({ stage, });
})));

app.post('/admin/quiz/:quizid/end', catchErrors(authed(async (req, res, email) => {
  const { quizid, } = req.params;
  await assertOwnsQuiz(email, quizid);
  await endQuiz(quizid);
  return res.status(200).send({});
})));

app.get('/admin/session/:sessionid/status', catchErrors(authed(async (req, res, email) => {
  const { sessionid, } = req.params;
  await assertOwnsSession(email, sessionid);
  return res.status(200).json({ results: await sessionStatus(sessionid), });
})));

app.get('/admin/session/:sessionid/results', catchErrors(authed(async (req, res, email) => {
  const { sessionid, } = req.params;
  await assertOwnsSession(email, sessionid);
  return res.status(200).json({ results: await sessionResults(sessionid), });
})));

/***************************************************************
                       Play Functions
***************************************************************/

app.post('/play/join/:sessionid', catchErrors(async (req, res) => {
  const { sessionid, } = req.params;
  const { name, } = req.body;
  const playerId = await playerJoin(name, sessionid);
  return res.status(200).send({ playerId, });
}));

app.get('/play/:playerid/status', catchErrors(async (req, res) => {
  const { playerid, } = req.params;
  return res.status(200).send({ started: await hasStarted(playerid), });
}));

app.get('/play/:playerid/question', catchErrors(async (req, res) => {
  const { playerid, } = req.params;
  return res.status(200).send({ question: await getQuestion(playerid), });
}));

app.get('/play/:playerid/answer', catchErrors(async (req, res) => {
  const { playerid, } = req.params;
  return res.status(200).send({ answerIds: await getAnswers(playerid), });
}));

app.put('/play/:playerid/answer', catchErrors(async (req, res) => {
  const { playerid, } = req.params;
  const { answerIds, } = req.body;
  await submitAnswers(playerid, answerIds);
  return res.status(200).send({});
}));

app.get('/play/:playerid/results', catchErrors(async (req, res) => {
  const { playerid, } = req.params;
  return res.status(200).send(await getResults(playerid));
}));

/***************************************************************
                       Running Server
***************************************************************/

app.get('/', (req, res) => res.redirect('/docs'));

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const configData = JSON.parse(fs.readFileSync('./config.json'));
const port = 'BACKEND_PORT' in configData ? configData.BACKEND_PORT : 5000;

const server = app.listen(port, () => {
  console.log(`Backend is now listening on port ${port}!`);
  console.log(`For API docs, navigate to http://localhost:${port}`);
});

export default server;

// websocket部分
// 发送websocket的时机：
// 1. 对于老师客户端：
//   1. 当第一次开始测验时：{ testId, testPaperId（可删） }；
//      服务器响应：创建testId为key，{ testPaperId，老师socket，学生sockets }为值的对象。
//   2. 当重新进入测验界面时：{ testId, testPaperId（可删） }；
//      服务器响应：更新老师socket。
//   3. 当移动到下一题时：{ testId，nextQuestion }
//      服务器响应：将试题本身（无答案）和题目开始时间组成的对象发给所有学生sockets。
// 2. 对于学生客户端：
//   1. 当第一次开始测验时：{ testId, examineeId, examineeName }；
//      服务器响应：添加examineeId和对应的socket进入对应的测验。然后把学生名字发给老师。
//   2. 当重新进入测验界面时：{ examineeId }；
//      服务器响应：遍历各个测验，找到examineeId并更新。
const sessionWebSockets = {}; // 以testId为键
ws.createServer(socket => {
  socket.on('error', (reason) => console.log(reason.code));
  socket.on('text', (clientInfo) => {
    clientInfo = JSON.parse(clientInfo);
    const { testId, testPaperId, webSocketOrder, nextQuestion, examineeId, examineeName } = clientInfo;
    // 当身份为老师
    if (!examineeId && webSocketOrder === 'reset') { // 建立过全双工且老师处于重新打开测验页面时
      sessionWebSockets[testId].teacher = socket;
    } else if (!examineeId && webSocketOrder === 'create') { // 未建立过全双工时
      sessionWebSockets[testId] = { testPaperId, teacher: socket, examinees: {} };
    } else if (!examineeId && nextQuestion) { // 当需要更新试题时（老师点击下一题）
      const allExamineeSockets = Object.values(sessionWebSockets[testId].examinees);
      allExamineeSockets.forEach(e => e.sendText(JSON.stringify(nextQuestion)));
    // 当身份为学生
    } else if (examineeId && examineeName) { // 有姓名则在对应测验上新建考试
      sessionWebSockets[testId].examinees[examineeId] = socket;
      sessionWebSockets[testId].teacher.sendText(examineeName);
    } else if (examineeId && !examineeName) { // 无姓名则遍历查询考号后重置
      for (let testId in sessionWebSockets) {
        if (!(examineeId in sessionWebSockets[testId].examinees)) continue;
        sessionWebSockets[testId].examinees[examineeId] = socket; break;
      }
    }
  })
}).listen(5006);
