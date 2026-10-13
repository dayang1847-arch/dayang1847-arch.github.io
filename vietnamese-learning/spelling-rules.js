// Northern reference pronunciations. These are spelling rules, not claims about
// the etymology of individual words.
const msu = 'https://openbooks.lib.msu.edu/vietnamese/chapter/section-8-combined-consonants-1/';
const msu2 = 'https://openbooks.lib.msu.edu/vietnamese/chapter/section-9-combined-consonants-2/';
const source = 'https://news.tuoitre.vn/learning-vietnamese-the-alphabet-and-phonetics-1035061.htm';

const rules = {
  gi: {
    sound: '/z/',
    why: 'gi 要作为一组声母来读，不能按英语字母 g、i 分开拼。在本课采用的河内北部读法中，gi 常读 /z/，接近英语 zoo 开头的 z。',
    contrast: 'g（如 gà）和 gh（如 ghế）表示另一种声母 /ɣ/；d（如 da）在北部也常读 /z/。所以要先认出 gi 这个组合。',
    history: '越南语的拉丁字母拼写保留了 gi 与 d 的区别；两者在现代北部口音中合流为 /z/。拼写记录的区别，不必强行按英语字母名来读。',
    memory: '看见 gi，先整体圈起来，读 /z/；再接韵母和声调：gi + á → giá。',
    compare: ['giá', 'gà', 'ghế', 'da'],
    sources: [{ title: 'MSU · 越南语复合声母', url: msu }, { title: 'Tuổi Trẻ · 北部 gi 与 d', url: source }],
  },
  g: {
    sound: '/ɣ/', why: '越南语 g 在 a、o、u 等元音前读浊软腭擦音 /ɣ/，不是英语 go 开头的 /g/。发音时舌后部靠近软腭，让气流摩擦通过。',
    contrast: '在 e、ê、i 前，同一个声母改写成 gh；gi 是另外的声母，北部常读 /z/。',
    memory: 'g 和 gh 是一组；gi 单独记成 /z/。', compare: ['gà', 'ghế', 'giá'], sources: [{ title: 'MSU · g、gh、gi', url: msu }],
  },
  gh: {
    sound: '/ɣ/', why: 'gh 与 g 表示同一声母 /ɣ/。拼写规则是在 e、ê、i 前用 gh，在其他元音前用 g。',
    contrast: 'gh 不等于 gi；北部 gi 常读 /z/。', memory: 'gh 后面优先找 e、ê、i；读音和 g 是一组。', compare: ['ghế', 'gà', 'giá'], sources: [{ title: 'MSU · g、gh、gi', url: msu }],
  },
  d: {
    sound: '/z/', why: '在河内北部读法中，越南语 d 常读 /z/，接近英语 zoo 的 z；它不是英语 dog 的 /d/。',
    contrast: '北部 d 与 gi 常同音；带横杠的 đ 才是另一声母 /ɗ/。', memory: 'd /z/、gi /z/；đ 另记。', compare: ['da', 'giá'], sources: [{ title: 'MSU · 单辅音', url: 'https://openbooks.lib.msu.edu/vietnamese/chapter/section-7-single-consonants/' }, { title: 'Tuổi Trẻ · 北部读法', url: source }],
  },
  r: {
    sound: '北部常读 /z/', why: '河内口音中 r 常与 d、gi 接近，读作 /z/；其他地区的 r 读法可能不同。',
    contrast: '同一拼写在不同地区会有口音差异。本课程用北部口音作发音参考。', memory: '北部先把 r、d、gi 作为一组相近的 /z/ 练习。', compare: ['rất', 'da', 'giá'], sources: [{ title: 'Tuổi Trẻ · 北部读法', url: source }],
  },
  ng: {
    sound: '/ŋ/', why: 'ng 两个字母表示一个鼻音 /ŋ/，类似英语 sing 的末尾音，但越南语也可把它放在音节开头。',
    contrast: '在 e、ê、i 前，开头的同一个鼻音写成 ngh。', memory: '把 ng 当一个声母，别在后面再加 /g/。', compare: ['người', 'nghe'], sources: [{ title: 'MSU · ng 与 ngh', url: msu2 }],
  },
  ngh: {
    sound: '/ŋ/', why: 'ngh 与 ng 的声母读音相同，拼写上 ngh 用在 e、ê、i 前。',
    contrast: 'ng 用在其他元音前，也能出现在音节末尾。', memory: '看到 ngh，认作一个 /ŋ/，再看后面的 e、ê、i。', compare: ['nghe', 'người'], sources: [{ title: 'MSU · ng 与 ngh', url: msu2 }],
  },
  nh: {
    sound: '/ɲ/', why: 'nh 两个字母表示一个腭鼻音 /ɲ/；舌面靠近硬腭，气流从鼻腔通过。它不是英语 n 加 h。',
    contrast: 'ng /ŋ/ 的舌位更靠后；nh /ɲ/ 的舌位更靠前。', memory: '把 nh 当一个声母，再接后面的韵母：nh + iêu。', compare: ['nhà', 'người'], sources: [{ title: 'MSU · nh 与 ng', url: msu2 }],
  },
  kh: {
    sound: '/x/', why: 'kh 是一个声母 /x/，让气流从舌后部与软腭之间摩擦通过；不要按英语 k 加 h 分开念。',
    contrast: '它和短促的 c、k 声母不同。', memory: 'kh 整体记成带摩擦感的声母。', compare: ['không', 'có'], sources: [{ title: 'MSU · kh', url: msu2 }],
  },
};

export function getSpellingRule(onset) {
  return rules[String(onset || '').toLocaleLowerCase('vi')] || null;
}
