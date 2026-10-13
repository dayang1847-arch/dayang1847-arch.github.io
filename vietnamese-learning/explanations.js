import { vocabulary } from './vocabulary.js';
import { IPA_BY_SYLLABLE } from './ipa-data.js';

// 越南语的书写空格常分隔音节；这里优先按常用词组拆解，避免逐音节硬译。
const EXTRA = `
ạ|礼貌语气词
xin|请／请求
xin chào|你好（礼貌问候）
chào|问候
cảm ơn|谢谢
xin lỗi|对不起
không sao|没关系
tạm biệt|再见
rất|很
được|得以／被
gặp|见面
khỏe|健康
người|人
trung quốc|中国
việt nam|越南
là|是
của|的
đây|这里／这个
cái này|这个
cái|个
gì|什么
bao nhiêu|多少
có|有／可以
không|不；句末可构成问句
một|一
hai|二
ba|三
chín|九
mười|十
một trăm|一百
trăm|百
bộ|套
chiếc|件／盏（量词）
đèn|灯
tên|名字
vâng|是／好的
biết|知道／会
thay|改变／替换
tại|在／于
đâu|哪里
hỏi|询问
với|和／与
xét|考量／检查
lời|话语
trong|在……里面／在……期间
thời|时间
tìm|寻找
thông|通／信息
báo|告知／报告
xuất|发出／出口
hiện|出现／现在
lô|批次
giao|交付
các|各／多个
sớm|早／提前
này|这／这个
nào|哪／哪个
minh|明（人名）
đến từ|来自
đến|到达
tiếng việt|越南语
tiếng trung|中文
tiếng|语言
đang|正在
học|学习
làm quen|结识
đồng nghiệp|同事
bạn|朋友／你
anh ấy|他
chị ấy|她
ấy|那位
ở|在
hà nội|河内
nói|说
cùng nhau|一起
cùng|共同
nhau|相互
sống|居住
một chút|一点
chút|一点
hãy|请／用来提出请求
chậm hơn|更慢
hơn|更
chưa|还没
hiểu|理解
hôm nay|今天
ngày mai|明天
thứ hai|星期一
thứ ba|星期二
thứ sáu|星期五
bây giờ|现在
giờ|点钟／小时
buổi sáng|上午
buổi chiều|下午
thời gian|时间
bận|忙
rảnh|有空
chúng ta|我们（包括对方）
chúng tôi|我们（不包括对方）
lúc|在……时候
ngày|天／日期
vào|在……时间／进入
có thể|可以／能够
thể|能力
hẹn gặp lại|再见／约好再见
hẹn|约定
đổi|更改
lịch hẹn|预约
lịch|日程
muộn|迟到／晚
cuộc họp|会议
họp|开会
bắt đầu|开始
xác nhận|确认
cho tôi|请给我
cho|给
bát|碗
phở|河粉
cốc|杯
nước|水
muốn|想要
xem|看
thực đơn|菜单
món này|这道菜
món|菜肴
cay|辣
ăn|吃
ngon|好吃
ít|少
đường|糖／路
ăn chay|吃素
chay|素食
thêm|再／添加
mang đi|带走／打包
tổng cộng|总共
tiền|钱
trả bằng|用……支付
trả|支付／退还
bằng|用……方式
thẻ|卡
tiền mặt|现金
hóa đơn|发票／账单
đi|去／走
sân bay|机场
taxi|出租车
ga tàu|火车站
xe buýt|公交车
xe|车
xuống|下车／下去
khách sạn|酒店
đi thẳng|直走
rẽ trái|左转
rẽ phải|右转
ngã tư|十字路口
xa|远
đặt phòng|订房
phòng|房间
nhận phòng|办理入住
mấy giờ|几点
mấy|几
khăn|毛巾
nhà sản xuất|制造商
sản xuất|生产
công ty|公司
cung cấp|提供
giải pháp|解决方案
chiếu sáng|照明
danh mục|目录
sản phẩm|产品
hợp tác|合作
quý công ty|贵公司
loại đèn|灯具类型
loại|类型
dự án|项目
cần|需要
hàng|货物
yêu cầu|要求
đã|已经／表示完成
nhận được|收到
nhận|接收
bản vẽ|图纸
gửi|发送
sẽ|将会
kiểm tra|检查
tra|查
số lượng|数量
qua email|通过邮件
email|电子邮件
đèn led|LED 灯
đèn đường|路灯
đèn pha|投光灯
đèn nhà xưởng|工矿灯
trong nhà|室内
ngoài trời|户外
công suất|功率／产能
watt|瓦
điện áp|电压
vôn|伏
điều chỉnh|调节
độ sáng|亮度
tuổi thọ|寿命
dự kiến|预计
bao lâu|多久
thông số kỹ thuật|技术参数
quang thông|光通量
lumen|流明
nhiệt độ màu|色温
góc chiếu|光束角
độ cao|高度
độ|度／程度
lắp|安装
dùng|使用
báo giá|报价
giá|价格
tính bằng|以……计算
đô la mỹ|美元
đơn giá|单价
đặt hàng|下单
tối thiểu|最低／最少
bao gồm|包括
thuế|税
đặt mẫu|订样品
mẫu|样品
sẵn sàng|准备好
đơn đặt hàng|采购订单／订单
đơn hàng|订单
hợp đồng|合同
điều kiện|条件
thanh toán|付款
đặt cọc|订金
hóa đơn thương mại|商业发票
hạn thanh toán|付款期限
hạn|期限
văn bản|书面文件
giao hàng|交货
đúng hạn|按时
sớm hơn|更早
tuần tới|下周
tuần|星期
gửi đi|发出
mã vận đơn|运单号
vận đơn|运单
cảng|港口
danh sách đóng gói|装箱单
danh sách|清单
đóng gói|包装
theo dõi|跟踪
lô hàng|一批货
bảo hành|保修
hoạt động|运作
ảnh|照片
bị lỗi|有故障／有缺陷
lỗi|错误／缺陷
vấn đề|问题
đề xuất|提出建议
nhà máy|工厂
kế hoạch sản xuất|生产计划
kế hoạch|计划
tiến độ|进度
mỗi ngày|每天
nguyên vật liệu|原材料
vật liệu|材料
linh kiện|零部件
chờ|等待
chưa đủ|不足
đủ|足够
lắp ráp|组装
trước khi|在……之前
trước|之前
dây chuyền|生产线
tạm dừng|暂停
chậm hơn kế hoạch|比计划慢
hoàn thành|完成
mới|新的
bảng mạch|电路板
bộ nguồn|电源
xong|完成
thử đèn|测试灯具
chất lượng|质量
báo cáo kiểm tra|检验报告
báo cáo|报告
tỷ lệ lỗi|不良率
đạt yêu cầu|符合要求
không đạt yêu cầu|不符合要求
phân tích|分析
nguyên nhân|原因
tách riêng|单独隔离
riêng|单独
kiểm tra lại|重新检查
nhà cung cấp|供应商
giá nguyên vật liệu|原材料价格
thay thế|替代
nhãn|标签
thùng hàng|箱货
thùng|箱子
kích thước|尺寸
xe tải|卡车
trên đường|在路上
trên|在……上
bị chậm|延误
tình trạng|状态
vận chuyển|运输
mục tiêu|目标
trình bày|陈述
phụ trách|负责
việc này|这件事
ghi lại|记录下来
quyết định|决定
phương án|方案
đồng ý|同意
thảo luận|讨论
chi phí|成本／费用
cuối cùng|最终
tham gia|参加
biên bản cuộc họp|会议纪要
tài liệu đính kèm|附件
đính kèm|附上
cập nhật|更新
phản hồi|回复
mong|期望
`;

const glossary = new Map(vocabulary.map(word => [word.vi.toLowerCase(), word.zh]));
for (const line of EXTRA.trim().split('\n')) {
  const divider = line.indexOf('|');
  if (divider > 0) glossary.set(line.slice(0, divider).trim(), line.slice(divider + 1).trim());
}

// 越南语空格分隔音节；词卡按每个书写单元播放，释义优先给出它在本课词句里的作用。
const TOKEN_EXTRA = `
Cảm|感受／感谢的心意
ơn|恩情／恩惠
Việt|越（国名构词）
Nam|南（国名构词）
sao|怎么／为何
Tạm|暂时
biệt|分别
Trung|中
Quốc|国
đồng|同／共同
nghiệp|职业／行业
Chúng|我们／群体代词的构词部分
làm|做／工作
việc|工作／事情
nhà|家／场所；构词时可指机构
cung|供给
cấp|提供／等级
sản|生产／产出
phẩm|品／产品
bao|多少（疑问词的一部分）
nhiêu|多少（疑问词的一部分）
từ|从／来自
công|工／公
ty|公司名称构词部分
quen|熟悉
Hà|河（河内的构词部分）
Nội|内（河内的构词部分）
chậm|慢
Hôm|今天／某一天
nay|今天／现在
thứ|第……／星期
mai|明天
Bây|此刻（“现在”的构词部分）
buổi|时段
sáng|上午／明亮
gian|时间段
chiều|下午／傍晚
ta|我们
lại|再／又
Cuộc|一场／一次
bắt|开始／抓住
đầu|头／开端
sáu|六
xác|准确／确认
thực|实际／真实
đơn|单／订单
mang|携带
Tổng|总
cộng|加／合计
mặt|面／表面
hóa|转变／票据构词部分
sân|场地
bay|飞
Ga|车站
tàu|火车／船
buýt|公交车构词部分
khách|客人／客户
sạn|酒店词的构词部分
thẳng|直
Rẽ|转弯
trái|左／反方向
ngã|路口
tư|四；十字路口构词部分
phải|右／应当
đặt|放置／下单
giải|解决
pháp|方法
chiếu|照射／投射
danh|名称／名录
mục|项目／条目
hợp|合作／合适
tác|工作／合作构词部分
quý|尊贵／贵方
Dự|预先／拟定
án|方案／项目
Khi|当……时
yêu|要求（在“yêu cầu”中）
cầu|请求／要求
bản|份／稿本
vẽ|画／绘制
số|数字／数量
lượng|数量
qua|通过
LED|LED
pha|投光灯构词部分
xưởng|车间／工厂
suất|率／能力
Điện|电
áp|压力／电压构词部分
điều|调节／事项
chỉnh|调整
Tuổi|年龄／年限
thọ|寿命
kiến|预计／看见
lâu|久／多长时间
kỹ|技术／精细
thuật|技术
Quang|光
Nhiệt|热／温度
màu|颜色
Góc|角度／角
cao|高
ngoài|外面
trời|天空／户外
tính|计算／计价
đô|美元计价单位
la|美元名称构词部分
Mỹ|美国
Đơn|单／每件
Số|数／数量
tối|最低（此处）／晚上（依上下文）
thiểu|最少
gồm|包括
sẵn|现成／已经准备
sàng|准备就绪构词部分
Điều|条件／事项
kiện|条件／部件
thanh|支付构词部分
toán|计算／结算
cọc|押金／订金
thương|商业／贸易
mại|买卖／贸易构词部分
khi|当……时
văn|文字／书面
tới|到／将近
đúng|正确／准时
mã|代码／编号
vận|运输
sách|册／清单构词部分
đóng|装／关闭
gói|包／包装
theo|跟随
dõi|留意／追踪
bảo|保证／保护
hành|执行／运作
hoạt|活动／运行
động|动作／运行
bị|遭遇／被（被动标记）
kiểm|检查
vấn|询问／问题构词部分
đề|事项／问题
Nhà|家／机构
máy|机器
Kế|计划
hoạch|计划构词部分
mỗi|每
cập|更新构词部分
nhật|日／更新构词部分
tiến|推进／进度
Nguyên|原有／原因
vật|物品／物料
liệu|材料／资料
linh|零件构词部分
ráp|装配
Dây|线／链条
chuyền|传送／产线构词部分
tạm|暂时
dừng|停止
Tiến|推进／进展
kế|计划
hoàn|完成构词部分
thành|成为／完成构词部分
bảng|板／表格
mạch|电路
nguồn|电源／来源
Sản|生产／产品构词部分
thử|试／测试
chất|品质／性质
cáo|报告构词部分
Tỷ|比率
lệ|比率构词部分
đạt|达到／合格
phân|分／分析构词部分
tích|分析构词部分
nguyên|原因／原料
nhân|因素／原因
tách|分开
thế|替代／更换
kích|尺寸构词部分
thước|尺度／尺寸构词部分
Danh|名称／名录
tải|装载／运输
tình|状态／情况
trạng|状态构词部分
chuyển|移动／运输
cuộc|一次／一场
Mục|目标／条目
tiêu|目标
trình|呈现／过程
bày|陈列／表达
phụ|辅助／负责的一部分
trách|责任
ghi|记录
quyết|决定
định|确定
phương|方向／方式
ý|意见／同意
thảo|讨论构词部分
luận|讨论／论述
Chi|费用构词部分
phí|费用
cuối|最后
tham|参与构词部分
gia|加入／家
biên|记录构词部分
tài|资料／文件
đính|附上
kèm|随附／一起
phản|回应
hồi|返回／回应
`;

const tokenGlossary = new Map([...glossary].filter(([token]) => !token.includes(' ')));
for (const line of TOKEN_EXTRA.trim().split('\n')) {
  const divider = line.indexOf('|');
  if (divider > 0) tokenGlossary.set(line.slice(0, divider).trim().toLowerCase(), line.slice(divider + 1).trim());
}

const SPECIAL = {
  'Xin chào': {
    parts: [['Xin', '礼貌表达的一部分'], ['chào', '问候']],
    logic: '“xin chào”是礼貌问候语，整体记作“你好／您好”；这里的“xin”不是单独的请求。',
  },
  'Cảm ơn': {
    parts: [['Cảm', '感受／心意'], ['ơn', '恩情／恩惠']],
    logic: '固定感谢表达，整体意思是“谢谢”，不按字面逐词翻译。',
  },
  'Rất vui': {
    parts: [['Rất', '很'], ['vui', '高兴']],
    logic: '程度词“rất”放在形容词“vui”前，组成“很高兴”。',
  },
  'Vâng ạ': {
    parts: [['Vâng', '是／好的'], ['ạ', '礼貌语气词']],
    logic: '先肯定回应，再在句末加“ạ”，让回答更礼貌。',
  },
  'Không ạ': {
    parts: [['Không', '不／不是'], ['ạ', '礼貌语气词']],
    logic: '先否定回答，再加“ạ”。礼貌语气不改变“不”的意思。',
  },
  'Xin lỗi': {
    parts: [['Xin', '请求／请'], ['lỗi', '错误／过失']],
    logic: '固定表达“对不起”，不要逐字译成“请求错误”。',
  },
  'Không sao': {
    parts: [['Không', '不'], ['sao', '怎么／问题']],
    logic: '固定表达“没关系”，常用于回应道歉。',
  },
  'Tạm biệt': {
    parts: [['Tạm', '暂时'], ['biệt', '分别']],
    logic: '合起来是“暂时分别”，日常用作“再见”。',
  },
};

const ONSETS = [
  ['ngh', '软腭鼻音 /ŋ/'], ['ng', '软腭鼻音 /ŋ/'], ['nh', '腭鼻音 /ɲ/'],
  ['ph', '近似 /f/'], ['th', '送气 /tʰ/'], ['tr', '北部参考读法 /tɕ/'],
  ['ch', '北部参考读法 /tɕ/'], ['kh', '擦音 /x/'], ['gh', '浊软腭擦音 /ɣ/'],
  ['gi', '北部常读 /z/'], ['qu', '带圆唇的 /kʷ/'], ['đ', '浊内爆音 /ɗ/'],
  ['b', '/ɓ/'], ['c', '/k/'], ['k', '/k/'], ['d', '北部常读 /z/'],
  ['g', '/ɣ/'], ['h', '/h/'], ['l', '/l/'], ['m', '/m/'], ['n', '/n/'],
  ['p', '/p/（多见于外来词或音节末）'], ['r', '河内口音常读 /z/'],
  ['s', '此北部转写读 /s/；部分说话人读得更靠后'], ['t', '/t/'], ['v', '/v/'], ['x', '/s/'],
];

const TONES = [
  ['\u0301', 'sắc（锐声）', '高升'], ['\u0300', 'huyền（玄声）', '低降'],
  ['\u0309', 'hỏi（问声）', '先降后升'], ['\u0303', 'ngã（跌声）', '上扬并带喉部收紧'],
  ['\u0323', 'nặng（重声）', '低、短，常带喉部收紧'],
];

function soundBreakdown(syllable) {
  const lower = syllable.toLowerCase();
  if (!IPA_BY_SYLLABLE[lower]) return {
    onset: '—', rhyme: '—', tone: '外来写法', contour: '按整词听音',
    cue: '此写法没有可靠的越南语音节转写，请用整词音频学习。',
  };
  const onset = ONSETS.find(([letters]) => lower.startsWith(letters));
  const onsetText = onset ? onset[0] : '';
  const rhyme = syllable.slice(onsetText.length) || '元音';
  const decomposed = lower.normalize('NFD');
  const tone = TONES.find(([mark]) => decomposed.includes(mark)) || ['', 'ngang（平声）', '平稳'];
  const vowelNote = /[\u0302\u0306\u031b]/u.test(rhyme.normalize('NFD')) ? '韵母中的变音符号会改变元音音质，要和基本字母一起记。' : '';
  const final = /([bcpt]|ch|m|n|ng|nh)$/iu.exec(rhyme)?.[0];
  const finalNote = final && /^(?:[bcpt]|ch)$/iu.test(final)
    ? `末尾 ${final} 是短促的塞音收尾，发到位后立即收住，不要额外加“呃”。`
    : final ? `末尾 ${final} 要发清楚；不要在后面多加一个元音。` : '';
  const initialNote = onset ? `声母 ${onsetText}：${onset[1]}` : '声母：无独立声母，从元音起音';
  return {
    onset: onsetText || '∅', rhyme,
    tone: tone[1], contour: tone[2],
    cue: [initialNote, `韵母 ${rhyme}`, vowelNote, finalNote].filter(Boolean).join('；'),
  };
}

function phraseLogic(phrase, parts) {
  const text = phrase.vi.toLowerCase();
  if (text.includes('thứ mấy')) return '“thứ mấy”询问星期几；“hôm nay”和“ngày mai”分别限定今天和明天。回答时要按实际日期填写星期。';
  if (text.includes('mấy giờ')) return text.includes('bây giờ')
    ? '“mấy giờ”询问几点；“bây giờ”把问题限定为当前时间，回答时要按实际时钟填写。'
    : '“mấy giờ”询问几点；要结合前后的动作或场景理解所问的时间。';
  if (/\bkhông$/u.test(text) && !text.startsWith('không')) return '句末的“không”把前面的陈述变成“……吗”的问句。';
  if (text.includes('bao nhiêu')) return '“bao nhiêu”询问数量、价格或数值，具体意思由前面的名词决定。';
  if (text.includes('ở đâu')) return '“ở đâu”放在句末询问地点，前面说清人或事物。';
  if (text.includes('chúng tôi')) return '“chúng tôi”指“我们”，通常不包括正在听话的人。';
  if (text.includes('chúng ta')) return '“chúng ta”指“我们”，包括正在听话的人。';
  if (text.includes('đang')) return '“đang”放在动作前，强调动作此刻正在进行。';
  if (text.includes('đã')) return '“đã”放在动作前，强调事情已经发生或完成。';
  if (text.includes('sẽ')) return '“sẽ”放在动作前，表示接下来会做这件事。';
  if (text.includes('của')) return '“của”连接事物和所属者，相当于中文的“……的”。';
  if (text.startsWith('xin ') && !text.startsWith('xin lỗi')) return '句首用“xin”提出请求，使表达更礼貌。';
  if (text.startsWith('hãy ')) return '句首用“hãy”提出指示或请求，后面接要做的动作。';
  if (text.startsWith('cho tôi')) return '“cho tôi”是“给我”，在点餐或索取物品时常用。';
  if (text.includes('có thể')) return '“có thể”表示“可以／能够”，后面接要做的事。';
  if (text.includes('cần')) return '“cần”表示“需要”，后面接物品或要完成的动作。';
  if (text.startsWith('tôi ')) return '先说“tôi（我）”，再接动作或状态，说明自己的情况。';
  const first = parts.find(part => part.gloss);
  return first ? `先抓住“${first.text}（${first.gloss}）”，再结合其余词组理解整句。` : `结合场景，把整句作为“${phrase.zh}”来记。`;
}

export function explainPhrase(phrase) {
  const special = SPECIAL[phrase.vi];
  if (special) return { parts: special.parts.map(([text, gloss]) => ({ text, gloss, sound: soundBreakdown(text) })), logic: special.logic };
  const parts = phrase.vi.split(/\s+/).map(text => ({ text, gloss: tokenGlossary.get(text.toLowerCase()) || '结合词组理解', sound: soundBreakdown(text) }));
  return { parts, logic: phraseLogic(phrase, parts) };
}
