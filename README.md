# React项目：测验小助手

1. 项目简介
2. 前端部分
3. 后端部分

## 1. 项目简介

1. 功能简介：让老师能准备并实施课堂测验（选择题组成），并在测验结束后能查看每题的统计数据和各个学生的答题情况。
2. 使用流程：
   1. 测验准备部分：（仅涉及老师）
      1. 在身份验证页面（http://localhost:3000/confirmIdentity）注册或登陆进入试卷查看页面（http://localhost:3000/testPapersShow）新建一套试卷。
      2. 点击新建的或以前的试卷，选择“修改试卷题目”进入试卷题目选择页面（http://localhost3000/testPaperQuestionsShow/:testPaperId）。
      3. 新建或选择一道题目进入题目修改页面（http://questionModify/:testPaperId/:questionOrder）。修改后想保存则点击“确定”，否则点击“放弃”。点击后返回试卷题目选择页面。
      4. 点击“返回”返回试卷查看页面。
   2. 测验进行部分：（涉及老师和学生）
      1. 老师进入试卷查看页面，点击想要使用的试卷，点击“用该套试卷开始测试”进入测验进行页面（http://localhost:3000/testGoing）。此时老师的页面上有本次测验Id和已经加入的学生。
      2. 学生从身份验证界面输入姓名和测验Id加入测验。
      3. 老师点击“开始”后所有人的页面同步显示第一题。倒计时结束前学生作答有效。
      4. 在需要进行下一题时老师点击“继续”即可使得所有人同步显示第二题。
      5. 没有下一题时老师若点击“继续”则结束测验。
      6. 任何时候老师可点击“结束”来立即结束测验。
   3. 测验结果部分：（仅涉及老师）
      1. 每次测验结束后老师可根据提示点击进入测验结果页面（http://localhost:3000/testResults/:testPaperId/:testId）查看本次测验数据。
      2. 或者，在试卷展示页面，老师可点击任意一套试卷进入历史测验展示页面（http://localhost:3000/historyTestsShow/:testPaperId）。再点击任一测验即可进入测验结果页面查看对应数据。
3. 总体要求：
   1. 支持Chrome浏览器。
   2. 使用React框架，利用redux进行组间通讯。
   3. ESlint检查语法风格。
   4. 跟学生相关页面支持移动端。

## 2. 前端部分

1. 所有页面：
   1. 拥有随视口大小改变而自适应的视口背景图。
   2. 在用户极短时间内快速点击同一个按钮时，提示用户不要过度点击。（节流）
   3. 在鼠标悬浮于按钮上时按钮样式会变。
   4. 关于提示框：
      1. 当用户操作有误，或有特殊情况需要提示时，展示提示框。
      2. 提示框展示时会从页面顶部滑下，在用户点击确认后滑上。
      3. 当短时间内有多个提示消息时：
         1. 若这些提示消息一样，只提示一次；
         2. 若这些提示消息不一致，依次展示，用户需要依次确认来关闭提示框。
   5. 使用楷体，若用户没有楷体则传楷体ttf。
2. 身份验证页面：
   1. 用户可以随时通过直接输入url地址（’http://localhost:3000/confirmIdentity‘）进入此页面。
   2. 教师通过输入email和密码进行登陆或注册。
   3. 以教师身份注册或登陆成功后进入试卷展示页面。
   4. 以教师身份登陆后，登陆状态会持久化保存。
   5. 以学生身份加入测验后进入测验进行页面。
3. 试卷展示页面：
   1. 教师登陆后，可随时直接输入url地址（’http://localhost:3000/testPapersShow‘）返回此页面。
   2. 右上角提供登出按钮。
   3. 按时间顺序从新到旧，依次展示用户创建的试卷。内容包括试卷的名称，创建时间，序号，总分值和总耗时。
   4. 试卷应懒加载展示。
   5. 若有正在进行的测验会予以提示。
   6. 已经创建的试卷再点击可对其进行删除，修改试卷名称，修改试题，开始测试或回顾测试历史操作。
   7. 没有题目的试卷无法进行测验。
   8. 若用户修改完某个试卷返回此页面，此页面应保持用户离开时的滚动位置，或者定位到修改的试卷。
4. 试卷试题展示页面：
   1. 教师登陆后，可随时输入url地址（’http://localhost:3000/testPaperQuestionsShow/:testPaperId‘）返回此页面。
   2. 有返回按钮可返回试卷展示页面。
   3. 标题提示用户正在修改的试卷的序号。
   4. 从上至下按题目序号依次展示题目的序号和题干，题干展示不下需要用省略号结尾。
   5. 当鼠标悬浮于某个试题上时，会显示该试题的类型（多选或单选），分值和时限。
   6. 可以新增，删除问题。也可以在点击问题后再点击修改问题进入问题修改界面。
   7. 若用户修改完某个试卷返回此页面，此页面应保持用户离开时的滚动位置，或者定位到修改的问题。
5. 试题修改页面：
   1. 教师登陆后，可随时输入url地址（’http://localhost:3000/questionModify/:testPaperId/:questionOrder‘）返回此页面。
   2. 标题显示用户正在修改的试卷序号和问题序号。
   3. 若问题为旧问题，在打开页面后默认展示旧问题的内容。
   4. 用户可随时在“问题属性（时限，分值，辅助材料类型和选项个数）”和”题干与选项（题干，辅助材料内容，选项和答案）“之间切换，切换到哪个就改哪个相关内容。
   5. 辅助材料可上传图片（以base64编码保存），或输入网络视频的分享代码（iframe）。
   6. 辅助材料上传后要展示出来，除非上传的不合法。不合法的辅助材料要给予提示。
   7. 有返回和确认两个按钮可返回试卷试题展示页面，返回按钮可放弃修改。确认按钮可确认更改。
   8. 不合法的内容即使用户按下确认也要阻止并弹出哪里不合法。
6. 测验进行页面：
   1. 若用户为老师：
      1. 必须通过试卷展示页面进入此页面，否则会弹出提示。
      2. 在测验未开始时，实时显示目前加入的学生。
      3. 在测验开始后，每道题目直接显示答案。
      4. 在测验结束后可根据提示查看测验结果。
      5. 若中途失误关闭网页，可重新进入测验。
   2. 若用户为学生：
      1. 做移动端适配。
      2. 测验未开始时有精灵动画缓解紧张情绪。
      3. 倒计时结束前可以答题，倒计时结束后锁定学生的最后一次作答并展示答案。
      4. 测验会根据老师的操作进入下一题。学生自己无法操作。
      5. 若中途失误关闭网页，可输入（http://localhost:3000/testGoing/:examineeId）重新进入测验。
7. 历史测验展示页面：
   1. 教师登陆后，可随时输入url地址（http://localhost:3000/testResults/:testPaperId）进入此页面。
   2. 从最新的测验开始依次懒加载展示各个测验的序号和日期。
   3. 点击任意一次测验即可进入对应的测验结果页面。
   4. 点击“返回”返回试卷展示页面。
8. 测验结果页面：
   1. 教师登陆后，可随时输入url地址（http://localhost:3000/testResults/:testPaperId/:testId）进入此页面。
   2. 展示所有考生的总耗时和总成绩。并以成绩榜形式从第一名开始展示。
   3. 展示所有考生的平均耗时和平均成绩。
   4. 用柱状图展示每道题目的平均耗时和正确率。
   5. 点击”返回“返回历史测验展示页面。

## 3. 后端部分

1. 总体要求：
   1. 后端语言为node.js。采用express框架。
   2. nodejs-websocket解决全双工问题。
   3. api为restful风格。
   4. 数据库简化为database.json文件，位于backend文件夹下。
   5. cors解决跨域。
   6. 应用eslint检查语法规范。
2. 支持的操作
   1. yarn start：用nodemon启动后端。启动后可访问"http://localhost:5005/doc"查看接口文档。
   2. yarn reset：重置后端数据。即清空数据库。
   3. 可以在backend/config.json里修改后端端口号。