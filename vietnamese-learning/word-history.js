// Only source-checked etymologies belong here. A syllable can have unrelated
// meanings and origins, so entries are restricted to the course sense/context.
const source = (title, url) => ({ title, url });

const records = {
  'giá': {
    kind: '汉越词', han: '價', meaning: '价格；价值',
    origin: '“价格”这个义项来自汉字「價」的汉越读音。越南语仍把 giá 用在询价、单价和报价中。',
    evolution: '从“价值、价格”的意思延续到日常购物和商务报价；giá bao nhiêu 就是询问“价格是多少”。同一个越南语拼写可能有别的义项，这里只解释课程中的“价格”。',
    memory: '看到「價」就联想到中文“价格”：giá = 价。整句“Giá bao nhiêu?”可记成“价，多少？”',
    sources: [source('Wiktionary · giá（越南语“价格”义）', 'https://en.wiktionary.org/wiki/gi%C3%A1#Vietnamese')],
  },
  'bao': {
    kind: '此义项非汉越词', han: '', meaning: '多少／多长等疑问表达的一部分',
    origin: '这里的 bao 属越南语疑问、指示用法；另有同形的汉越词 bao「包」，意思是包裹。两个义项不能因为拼写相同就混为一谈。',
    evolution: '在 bao nhiêu（多少）里，bao 与表示“多”的 nhiều 组合；这个构词环境中，后一个音节出现平声形式 nhiêu。',
    memory: '把 bao 当作打开数量问题的“问号”：bao nhiêu 问多少，bao lâu 问多久。',
    sources: [source('Wiktionary · bao（不同词源）', 'https://en.wiktionary.org/wiki/bao#Vietnamese'), source('Wiktionary · bao nhiêu（构词）', 'https://en.wiktionary.org/wiki/bao_nhi%C3%AAu#Vietnamese')],
  },
  'nhiêu': {
    kind: '需按词组判断', han: '饒（另有该汉越读法）', meaning: '在 bao nhiêu 中表示“多、多少”',
    origin: '词典把 bao nhiêu 解释为 bao（如何）与 nhiều（多）组合，并记录后一个音节的声调变化。单独的 nhiêu 也有汉越字「饒」的词源记录。',
    evolution: '记忆这个问句时，应把 bao nhiêu 当成整体“多少”；不能只凭 nhiêu 的汉字写法推断整个词组的历史。',
    memory: '把 nhiều（多）与 nhiêu 并排记：进入 bao nhiêu 这个疑问词组后，写作平声 nhiêu。',
    sources: [source('Wiktionary · bao nhiêu（声调变化）', 'https://en.wiktionary.org/wiki/bao_nhi%C3%AAu#Vietnamese'), source('Wiktionary · nhiêu', 'https://en.wiktionary.org/wiki/nhi%C3%AAu#Vietnamese')],
  },
  'đèn': {
    kind: '汉语来源，非标准汉越读音', han: '燈（标准汉越读音：đăng）', meaning: '灯；灯具',
    origin: '词典将 đèn 视为汉字「燈」的非标准汉越读音；标准汉越读音是 đăng。',
    evolution: '今天 đèn 是日常说灯的常用词，也进入 đèn đường（路灯）、đèn pha（投光灯）等产品名称。',
    memory: '见到 đèn，先联想到照明产品；再对照「燈 → đăng」记住“同源不等于标准汉越读音”。',
    sources: [source('Wiktionary · đèn', 'https://en.wiktionary.org/wiki/%C4%91%C3%A8n#Vietnamese')],
  },
  'tôi': {
    kind: '非汉越词', han: '', meaning: '我（中性、自称）',
    origin: '词典把代词 tôi 与“仆人、侍从”这一谦称义联系起来，并列出与其他越芒语支语言的对应词。',
    evolution: '从谦称逐渐转为常用第一人称代词；在现代课程句子中，tôi 是介绍自己时的稳妥说法。',
    memory: '把“自谦地称自己”到“我”的变化串起来：Tôi là… = 我是……。',
    sources: [source('Wiktionary · tôi（代词词源）', 'https://en.wiktionary.org/wiki/t%C3%B4i#Vietnamese')],
  },
  'không': {
    kind: '汉越词', han: '空', meaning: '不；没有；句末构成是非问句',
    origin: '来自汉字「空」的汉越读音，早先有“空、无、零”的含义。',
    evolution: '“没有、零”的意思逐渐发展为常用否定词；放在句末也可组成“……吗？”的问句。',
    memory: '从「空」想到“没有”：Tôi không ăn cay = 我不吃辣；Anh khỏe không? = 您好吗？',
    sources: [source('Wiktionary · không（词源与语法化）', 'https://en.wiktionary.org/wiki/kh%C3%B4ng#Vietnamese')],
  },
  'chào': {
    kind: '词源有争议', han: '可能与「朝」有关', meaning: '问候；打招呼',
    origin: '有词源资料提出 chào 可能是汉字「朝」的非标准汉越读法，但该联系仍是可能性，不能当作定论。',
    evolution: '现代 chào 既能用于见面问候，也能用于告别；与 xin 组合成礼貌的 xin chào。',
    memory: '把“见面问候”和“离开告别”两个场景连起来，记住 chào 的使用范围。',
    sources: [source('Wiktionary · chào（可能词源）', 'https://en.wiktionary.org/wiki/ch%C3%A0o#Vietnamese')],
  },
};

const phraseRecords = {
  'sản phẩm': {
    kind: '汉越复合词', han: '產品', meaning: '产品',
    origin: 'sản phẩm 来自汉字「產品」：sản 对应“产”，phẩm 对应“品”。',
    evolution: '两个构词成分合起来表示生产出来的物品；在照明商务句子里指灯具等产品。',
    memory: 'sản = 产，phẩm = 品；和中文“产品”一一对应。',
    sources: [source('Wiktionary · sản phẩm', 'https://en.wiktionary.org/wiki/s%E1%BA%A3n_ph%E1%BA%A9m#Vietnamese')],
  },
  'việt nam': {
    kind: '汉越专名', han: '越南', meaning: '越南',
    origin: 'Việt Nam 对应汉字「越南」，由 Việt（越）和 Nam（南）组成。',
    evolution: '词源资料把现代国名与历史上的 Nam Việt（南越）名称联系起来；具体国名史比字面拆解更复杂。',
    memory: '两个音节与汉字顺序相同：Việt = 越，Nam = 南。',
    sources: [source('Wiktionary · Việt Nam（国名词源）', 'https://en.wiktionary.org/wiki/Vi%E1%BB%87t_Nam#Vietnamese')],
  },
  'cảm ơn': {
    kind: '汉语来源的现代固定表达', han: '感恩（现代标准汉越读法：cảm ân）', meaning: '谢谢',
    origin: '词典记录 cảm ơn 与较早的 cám ơn、汉字「感恩」之间的关系；现代标准汉越读法为 cảm ân。',
    evolution: 'cám ơn 后来受到书面读法 cảm ân 影响，形成今天常用的 cảm ơn。',
    memory: '把“感”到“恩”的意思与现代口语表达连接起来，整词记作“谢谢”。',
    sources: [source('Wiktionary · cảm ơn（形式演变）', 'https://en.wiktionary.org/wiki/c%E1%BA%A3m_%C6%A1n#Vietnamese')],
  },
};

export function getWordHistory(token, context = '') {
  const key = token.toLocaleLowerCase('vi');
  const phrase = context.toLocaleLowerCase('vi');
  const compound = Object.entries(phraseRecords).find(([word]) =>
    word.split(' ').includes(key) && new RegExp(`(^|\\s)${word.replace(' ', '\\s+')}($|\\s)`, 'u').test(phrase));
  if (compound) return { ...compound[1], headword: compound[0], focus: token, verified: true };
  if (records[key]) return { ...records[key], headword: token, focus: token, verified: true };
  return {
    headword: token, focus: token, verified: false,
    kind: '词源待核', han: '',
    origin: '目前没有针对这个义项核实过的词源资料，因此暂不判断它是否为汉越词。',
    evolution: '同一个越南语音节可能属于不同词组，也可能对应不同来源；需要结合具体词义查证。',
    memory: '', sources: [],
  };
}
