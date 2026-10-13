// 常用日常交流词汇。这里集中维护译文，避免在界面代码中散落词条。
const RAW = [
  ['问候与礼貌', '👋', 'xin chào=你好|chào buổi sáng=早上好|chào buổi tối=晚上好|tạm biệt=再见|cảm ơn=谢谢|xin lỗi=对不起|không sao=没关系|vâng=是的／好的|không=不／不是|làm ơn=劳驾／请|rất vui=很高兴|hẹn gặp lại=回头见'],
  ['称呼与人物', '🧑', 'tôi=我|bạn=你／朋友|anh=哥哥／对成年男性的称呼|chị=姐姐／对成年女性的称呼|em=弟妹／对较年轻者的称呼|chúng tôi=我们（不包括对方）|chúng ta=我们（包括对方）|gia đình=家庭|bạn bè=朋友们|đồng nghiệp=同事|khách hàng=客户|nhân viên=员工'],
  ['提问与连接', '❔', 'ai=谁|gì=什么|ở đâu=在哪里|khi nào=什么时候|bao nhiêu=多少|tại sao=为什么|như thế nào=怎么样|có=有／是|và=和|nhưng=但是|vì=因为|nếu=如果'],
  ['数字与时间', '⏰', 'một=一|hai=二|ba=三|bốn=四|năm=五|mười=十|hôm nay=今天|ngày mai=明天|hôm qua=昨天|buổi sáng=上午／早晨|buổi chiều=下午|buổi tối=晚上'],
  ['饮食与购物', '🍜', 'nước=水|cơm=米饭|phở=河粉|bánh mì=面包|cà phê=咖啡|trà=茶|ngon=好吃|cay=辣|thực đơn=菜单|giá=价格|tiền mặt=现金|hóa đơn=发票／账单'],
  ['出行与地点', '🧭', 'đường=路|sân bay=机场|ga tàu=火车站|khách sạn=酒店|nhà hàng=餐厅|công ty=公司|nhà máy=工厂|taxi=出租车|xe buýt=公交车|bên trái=左边|bên phải=右边|ở đây=在这里'],
  ['常用动作', '⚡', 'đi=去／走|đến=来／到|về=回|ăn=吃|uống=喝|mua=买|bán=卖|xem=看|nghe=听|nói=说|học=学习|làm việc=工作'],
  ['感受与状态', '☀️', 'tốt=好|đẹp=漂亮|mới=新|cũ=旧|nóng=热|lạnh=冷|mệt=累|vui=开心|buồn=难过|bận=忙|rảnh=有空|cần=需要'],
];

export const vocabularyGroups = RAW.map(([name, icon, raw], groupIndex) => ({
  id: `v${groupIndex + 1}`,
  name,
  icon,
  words: raw.split('|').map((entry, wordIndex) => {
    const [vi, zh] = entry.split('=');
    return { id: `v${groupIndex + 1}w${wordIndex + 1}`, vi, zh, audio: null };
  }),
}));
export const vocabulary = vocabularyGroups.flatMap(group => group.words);
