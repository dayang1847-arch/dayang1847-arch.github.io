// Learning cues for the course's attested constructions, not a general parser.
const ref = (title, url) => ({ title, url });
export const languageSources = {
  words: ref('越南语词边界研究 · LREC', 'https://aclanthology.org/L08-1355/'),
  identity: ref('MSU · là 与 gì', 'https://openbooks.lib.msu.edu/vietnamese/chapter/u1-grammar/'),
  questions: ref('MSU · 地点与疑问词', 'https://openbooks.lib.msu.edu/vietnamese/chapter/u2-grammar/'),
  aspect: ref('MSU · là、đã 与 chưa', 'https://openbooks.lib.msu.edu/vietnamese/chapter/u6-grammar/'),
  address: ref('MSU · 称呼与礼貌语境', 'https://openbooks.lib.msu.edu/vietnamese/chapter/u1-culture-notes/'),
  future: ref('MSU · 意愿与计划', 'https://openbooks.lib.msu.edu/vietnamese/chapter/u13-grammar/'),
  time: ref('MSU · 时间问句', 'https://openbooks.lib.msu.edu/vietnamese/chapter/u4-grammar/'),
  means: ref('MSU · bằng 与交通方式', 'https://openbooks.lib.msu.edu/vietnamese/chapter/u14-grammar/'),
  polarity: ref('NIU · có…không、đã…chưa 与量词', 'https://seasite.niu.edu/vietnamese/uniLesson8/L8_grammar.htm'),
  ownership: ref('NIU · của、cho 与商务请求例句', 'https://seasite.niu.edu/vietnamese/uniLesson16/L16_dialog.htm'),
  pronouns: ref('越南语称谓讲义 · 包容与排除的我们', 'https://cs.nyu.edu/~nhan/Nhap-gia-van-huy_revisit_20150929.pdf'),
  ongoing: ref('NIU · 越南语教学框架：时间与体', 'https://seasite.niu.edu/jsealt/past%20issues/volume%2010/VN%20LLF%20Part%20I.pdf'),
  instruction: ref('NIU · hãy 的行动指示', 'https://seasite.niu.edu/vietnamese/uniLesson12/L12_grammar.htm'),
  ability: ref('NIU · có thể 例句', 'https://seasite.niu.edu/vietnamese/uniLesson18/L18_exercises.htm'),
  date: ref('MSU · 星期与日期问句', 'https://openbooks.lib.msu.edu/vietnamese/chapter/u5-grammar/'),
  phonology: ref('vPhon · 北部拼写与音值', 'https://github.com/kirbyj/vPhon'),
};

export const learningPrinciples = [
  { id: 'word', title: '空格分隔音节，词义要看组合', body: 'sản phẩm 写成两个音节，但合起来表达“产品”。先记完整的词或常用词块，再拆音节练发音；不要把音节释义当作整词的历史来源。', example: 'sản phẩm', prompt: '怎样学习 sản phẩm 更合适？', choices: ['整词记“产品”，再逐音节练发音', '有两个空格单元，就按两个独立单词硬译'], answer: 0, feedback: '词和书写音节不总是一一对应。本课的词块帮助理解与记忆，不是对所有越南语句子的自动词法分析。', source: languageSources.words },
  { id: 'spelling', title: '先认越南语声母组合', body: 'giá 的开头是 gi，北部常读 /z/；g、gh 对应 /ɣ/。字母形状相同，并不意味着越南语和英语采用同一套拼读规则。', example: 'giá', prompt: '北部参考读法中，giá 的开头是什么？', choices: ['把 g、i 按英语逐字拼读', '把 gi 作为一组声母读 /z/'], answer: 1, feedback: '先认 gi，再接 á 的元音和锐声。gì 中的 i 还承担元音作用，拼写与音节结构不能机械地切字符串。', source: languageSources.phonology },
  { id: 'predicate', title: '身份用 là，形容词通常直接作谓语', body: 'Tôi là người Trung Quốc 用 là 连接身份；Tôi khỏe 直接说明状态。越南语不能把每个英语 be 都替换成 là。', example: 'Tôi khỏe', prompt: '要说“我很好”，本课使用哪句？', choices: ['Tôi khỏe', 'Tôi là khỏe'], answer: 0, feedback: 'khỏe 是健康状态，不是身份名词；在这个简单陈述中直接接在主语后。', source: languageSources.aspect },
  { id: 'question', title: '疑问词说明“缺少哪条信息”', body: 'ở đâu 问地点，khi nào 问时间，bao nhiêu 问数量或价格。把疑问部分放回它承担的句子位置，先理解所问内容。', example: 'Anh làm việc ở đâu', prompt: '哪句询问工作地点？', choices: ['Anh làm việc khi nào', 'Anh làm việc ở đâu'], answer: 1, feedback: 'ở đâu 对应地点；khi nào 对应时间。两句都可表达问题，但索取的信息不同。', source: languageSources.questions },
  { id: 'we', title: '“我们”是否包含听话人？', body: 'chúng tôi 通常不包含听话人；chúng ta 包含双方。介绍自己的公司与约对方一起行动，所选的“我们”不同。', example: 'Chúng ta gặp nhau vào ngày mai', prompt: '邀请对方“我们明天见面”，本课使用哪句？', choices: ['Chúng ta gặp nhau vào ngày mai', 'Chúng tôi gặp nhau vào ngày mai'], answer: 0, feedback: '共同约见时用 chúng ta 把对方包括进来。chúng tôi 更适合谈说话人一方的安排。', source: languageSources.pronouns },
  { id: 'completion', title: '陈述、否定和问句要分清', body: 'đã 常提示“已经”；chưa 在动作前可表示“尚未”，放到这类问句末尾则询问“已经……了吗”。先看整句，再解释单个标记。', example: 'Giá đã bao gồm thuế chưa', prompt: '哪句是在问“价格含税了吗”？', choices: ['Giá đã bao gồm thuế', 'Giá đã bao gồm thuế chưa'], answer: 1, feedback: '第二句的句末 chưa 提出是否已经成立的问题；第一句是“价格已经含税”的陈述。', source: languageSources.polarity },
  { id: 'number', title: '把数字、量词和物品排成一组', body: 'một cái đèn 对应“一盏灯”：数字在前，量词接着出现，再说物品。bộ 强调“套”，不能只因都译成“个”就互换。', example: 'Một cái đèn', prompt: '本课“一盏灯”的词序是哪种？', choices: ['Một cái đèn', 'Một đèn cái'], answer: 0, feedback: '这里按“数字 → 量词 → 物品”排列；时间、计量单位等结构需结合具体名词学习。', source: languageSources.polarity },
  { id: 'time', title: '时间线索独立出现，动词不靠变形表达它们', body: 'đang 常提示进行中的状态，sẽ 表示将要。时间还会由 hôm nay、ngày mai 和上下文交代，不要把标记简单等同于英语动词的词尾变化。', example: 'Tôi đang học tiếng Việt', prompt: '哪句强调“正在学习”？', choices: ['Tôi sẽ học tiếng Việt', 'Tôi đang học tiếng Việt'], answer: 1, feedback: 'đang 指向进行中的学习；sẽ 指向将要学习。完整时间解释仍依赖语境。', source: languageSources.ongoing },
];

const fixed = new Set(['xin chào', 'cảm ơn', 'xin lỗi', 'không sao', 'tạm biệt', 'hẹn gặp lại']);

export function languageLogic(phrase) {
  const text = phrase.vi.toLocaleLowerCase('vi').normalize('NFC');
  const tokens = text.split(/\s+/u);
  const has = token => tokens.includes(token);
  const rules = [];
  const add = (id, title, pattern, explanation, contrast, source) => rules.push({ id, title, pattern, explanation, contrast, source });
  if (fixed.has(text)) add('fixed', '固定表达，整体理解', phrase.vi, '这是一种惯用表达。先把整组声音与交际功能连接起来，再学习内部音节。', '逐音节的字面释义不等于实际用法，也不等于词源证据。', languageSources.address);
  else if (text.endsWith('chưa')) add('completion-question', '询问“已经……了吗”', '对象 + (đã) + 动作／状态 + chưa?', '这里的句末 chưa 询问事情是否已经成立；它不是在断言“还没有”。', '动作前的 chưa 才是这类陈述中“尚未”的线索。', languageSources.polarity);
  else if (text.endsWith('được không')) add('permission', '征询可行性或许可', '事情／请求 + được không?', 'được không 把事情交给对方确认是否可行，常用来问“可以吗”。', '这里的 được 不能按单独词义硬译成“得到”。', languageSources.ownership);
  else if (text.endsWith('không') && !text.startsWith('không')) add('polar', '问“是／否”的问题', '人／事物 + (có) + 动作／状态 + không?', '句末 không 是是非问句线索；có 是否出现，要按具体句型学习。', '不要把句末 không 和动作前表示否定的 không 混淆。', languageSources.polarity);
  if (text.includes('thứ mấy')) add('weekday', '询问星期几', 'hôm nay／ngày mai + là + thứ mấy?', 'thứ mấy 索取星期信息；回答要根据实际日期选星期，而不是固定背某一天。', 'thứ hai 是星期一，thứ ba 是星期二；不要直接按数字二、三翻成星期二、三。', languageSources.date);
  else if (text.includes('mấy giờ')) add('clock', '询问钟点', '时间／动作 + mấy giờ?', text.includes('bây giờ') ? 'mấy giờ 索取几点的信息；bây giờ 把问题限定为当前钟点。' : 'mấy giờ 索取几点的信息；这里要结合动作或场景，理解所问的时间。', '回答约定时间时说明上午、下午或晚上，避免时间歧义。', languageSources.time);
  else if (text.includes('ở đâu')) add('place', '询问地点', '人／事物 + (动作) + ở đâu?', 'ở đâu 位于地点信息的位置，问人或事物在哪里，或动作在哪里发生。', '与英语疑问句相比，不需要一律把这个疑问词组移到句首。', languageSources.questions);
  else if (text.includes('bao nhiêu')) add('quantity', '询问数量、价格或参数', '要问的数值 + ... + bao nhiêu?', 'bao nhiêu 提出“多少”的问题；前面的事物决定问价格、数量还是技术数值。', '商务回答还应确认单位、币种和计价口径。', languageSources.polarity);
  else if (text.includes('bao lâu')) add('duration', '询问时长', '事项 + ... + bao lâu?', 'bao lâu 问持续多久，例如交货周期、寿命和保修期。', '问某个钟点用 mấy giờ，问持续时长用 bao lâu。', languageSources.time);
  else if (has('gì')) add('what', '询问内容或身份', '要问的内容 + gì?', 'gì 代替未知的内容，常留在该内容在句中承担的位置。', '例如 tên ... là gì 索取姓名，不是询问地点或数量。', languageSources.identity);
  else if (text.includes('khi nào')) add('when', '询问时间', 'khi nào + 事情?／事情 + khi nào?', 'khi nào 问什么时候；本课先按完整句子学习它出现的位置。', '不要把 khi nào 的“何时”译成 nào 的单独词义“哪个”。', languageSources.time);
  else if (has('nào')) add('which', '询问哪一种或哪一个', '名词 + nào?', 'nào 与名词搭配，指出要对方在某类事物中确定一个。', '名词先出现，再用 nào 指明“哪一个”。', languageSources.questions);
  if (has('là')) add('identity', '连接身份、类别或对应信息', 'A + là + B', '本课的 là 把对象与身份、类别或对应信息联系起来。', '简单形容词状态通常直接作谓语：Tôi khỏe，而非 Tôi là khỏe。', languageSources.aspect);
  if (has('của')) add('possession', '把所属者放在事物后', '事物 + của + 所属者', '先说事物，再由 của 引出它属于谁；“sản phẩm của chúng tôi”是“我们的产品”。', '中文常把“我们的”放在前面，越南语这个结构的顺序相反。', languageSources.ownership);
  if (has('đang')) add('ongoing', '指向进行中的动作或状态', '人／事物 + đang + 动作／状态', 'đang 给出进行中的线索，动词本身不需要为了这个意思更换词尾。', '时间仍由上下文共同确定，不必在每个现在时句子里加 đang。', languageSources.ongoing);
  if (has('chưa') && !text.endsWith('chưa')) add('not-yet', '表达“尚未”', '人／事物 + chưa + 动作／状态', '这里的 chưa 位于动作或状态前，说明目前尚未成立。', 'Tôi chưa hiểu 比直接的“不懂”多了一层“还没理解”的意味。', languageSources.aspect);
  if (has('sẽ')) add('future', '表达将要发生的安排', '人／事物 + sẽ + 动作', 'sẽ 是将要发生的线索；时间词和交际语境会进一步说明何时发生。', '越南语动词不需要像英语那样加过去时词尾。', languageSources.future);
  if (has('đã') && !text.endsWith('chưa')) add('already', '表达“已经”的线索', '人／事物 + đã + 动作／状态', '在本课语境中，đã 提示事情已经发生或已经成立。', '不要把它当作与英语过去时完全一一对应的动词变化。', languageSources.aspect);
  if (has('không') && !text.endsWith('không') && text !== 'không sao') add('negative', '在动作或状态前否定', '人／事物 + không + 动作／状态', '这里的 không 否定后面的动作或状态。', 'Tôi không ăn cay 中是否定“不吃辣”，不是句末的是非问句。', languageSources.polarity);
  if (text.startsWith('xin ') && !fixed.has(text)) add('request', '礼貌地提出请求', 'Xin + 请求内容', 'xin 用来引出请求；商务交际还可以根据关系补充称呼和语气词。', 'xin lỗi、xin chào 等固定表达要按整体记，不套成所有请求句。', languageSources.address);
  if (text.startsWith('hãy ')) add('instruction', '提出行动指示', 'Hãy + 动作', 'hãy 引导对方做某事，常用于说明或指示。', 'hãy 本身不是万能的“请”；礼貌程度还取决于称呼、关系和语气。', languageSources.instruction);
  if (text.startsWith('cho tôi')) add('give', '点单或索取', 'Cho tôi + 所需物品', '点单或索取时，可用 cho tôi 表达“给我……”的需求。', '真实交流可补充称呼、ạ 或感谢，让语气更符合关系。', languageSources.ownership);
  if (text.includes('có thể')) add('ability', '表达能够或可行', '人／事物 + có thể + 动作', 'có thể 作为词组表达能够、可以或可行，后面接动作。', '单独 có 的存在、拥有等用法与 có thể 的意思不同。', languageSources.ability);
  if (has('bằng')) add('means', '表达手段或方式', '动作 + bằng + 手段／方式', 'bằng 引出交通、工具或付款方式，例如 bằng taxi、bằng thẻ。', '表示手段时，不要一律套用表示“和／与”的 với。', languageSources.means);
  if (/^(một|hai|ba|mười)\s/u.test(text)) add('number', '数字与计数结构', '数字 + (量词) + 名词／单位', '本课把数量放在前面；灯具可配 cái、bộ、chiếc，时间则配 ngày 等单位。', '按物品和计数方式选择量词；不能把所有量词都当作同一个“个”。', languageSources.polarity);
  if (!rules.length) add('context', '按意群理解顺序', '先确定交际目的，再顺着词块理解', '先辨认整词与固定搭配，再看谁做什么、涉及什么对象和时间地点。', '词块划分用于本课记忆；未核实的语法或词源不应编成历史故事。', languageSources.words);

  const usage = [];
  if (has('anh') || has('chị')) usage.push({ text: text.includes('anh ấy') || text.includes('chị ấy') ? 'anh ấy／chị ấy 在这里指“他／她”；并非直接对听话人说“您”。' : 'anh／chị 的选择涉及年龄、社会关系和交际角色，不能只按“男性／女性”机械套用。中文“您”是本课的礼貌译法，并非固定的一一对应。', source: languageSources.address });
  if (text.includes('chúng tôi')) usage.push({ text: 'chúng tôi 通常指说话人一方的“我们”，不包括听话人。', source: languageSources.pronouns });
  if (text.includes('chúng ta')) usage.push({ text: 'chúng ta 把说话人和听话人包括在共同的“我们”中。', source: languageSources.pronouns });
  if (has('ạ')) usage.push({ text: 'ạ 是礼貌语气标记，常见于对较年长者或更高身份者说话；它不改变前面词组的核心词义。', source: languageSources.address });
  return { rules: rules.slice(0, 3), usage };
}
