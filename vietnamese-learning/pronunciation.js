// Northern Vietnamese reference tones in vPhon 2.1.1's surface notation.
// Superscript numbers are Chao tone values; ˀ indicates glottalization.
export const toneRecords = [
  { id: 'ngang', name: 'ngang', zh: '平声', mark: 'ma', meaning: '鬼', contour: '平稳', ipa: '[maː³³]' },
  { id: 'huyen', name: 'huyền', zh: '玄声', mark: 'mà', meaning: '但是', contour: '低降', ipa: '[maː³²]' },
  { id: 'sac', name: 'sắc', zh: '锐声', mark: 'má', meaning: '脸颊', contour: '高升', ipa: '[maː²⁴]' },
  { id: 'hoi', name: 'hỏi', zh: '问声', mark: 'mả', meaning: '坟墓', contour: '先降后升', ipa: '[maː³¹²]' },
  { id: 'nga', name: 'ngã', zh: '跌声', mark: 'mã', meaning: '代码；马', contour: '喉部收紧后上扬', ipa: '[maː³ˀ⁵]' },
  { id: 'nang', name: 'nặng', zh: '重声', mark: 'mạ', meaning: '秧苗', contour: '低、短、喉部收紧', ipa: '[maː²¹ˀ]' },
];

export const ipaSource = {
  label: 'James P. Kirby，vPhon 2.1.1（北部口音转写）',
  url: 'https://github.com/kirbyj/vPhon',
};
