// 课程修订入口：修改 LESSONS 中的词句、译文与讲解；发布内容时递增 COURSE_VERSION。
export const COURSE_VERSION = 2;

const RAW = [
  ['发音起步', '基础', '👋', [
    ['你好，越南语！', '越南语有声调。先听完整词组，再模仿节奏；称呼会随对象变化。', 'Xin chào=你好|Chào anh=您好（对男性）|Chào chị=您好（对女性）|Cảm ơn=谢谢|Việt Nam=越南'],
    ['礼貌表达', '“ạ”常用于礼貌回应。先记住高频表达，之后再学习更复杂的称呼。', 'Vâng ạ=好的（礼貌）|Không ạ=不是（礼貌）|Xin lỗi=对不起|Không sao=没关系|Tạm biệt=再见'],
    ['初次见面', '“rất vui”表示很高兴；越南语问句常在句末加“không”。', 'Rất vui được gặp anh=很高兴见到您（男性）|Rất vui được gặp chị=很高兴见到您（女性）|Anh khỏe không=您好吗（男性）|Chị khỏe không=您好吗（女性）|Tôi khỏe=我很好'],
  ]],
  ['基础句型', '基础', '🔤', [
    ['我、你、我们', '“tôi”是我，“chúng tôi”是我们（不包括听话人）。商务场景要留意称呼。', 'Tôi là người Trung Quốc=我是中国人|Anh là người Việt Nam=您是越南人（男性）|Chị là đồng nghiệp của tôi=您是我的同事（女性）|Chúng tôi là nhà cung cấp=我们是供应商|Đây là sản phẩm của chúng tôi=这是我们的产品'],
    ['简单问句', '“ở đâu”问地点，“bao nhiêu”问数量或价格。', 'Anh tên là gì=您叫什么名字（男性）|Chị làm việc ở đâu=您在哪里工作（女性）|Cái này là gì=这是什么|Giá bao nhiêu=多少钱|Có được không=可以吗'],
    ['数字与数量', '数字先用于日期、数量和报价，听到数字时注意单位。', 'Một cái đèn=一盏灯|Hai bộ đèn=两套灯具|Ba ngày=三天|Mười sản phẩm=十件产品|Một trăm chiếc=一百件'],
  ]],
  ['认识彼此', '日常', '🤝', [
    ['自我介绍', '越南语可用“tôi là…”说明身份，用“tên tôi là…”说姓名。', 'Tên tôi là Minh=我叫明|Tôi đến từ Trung Quốc=我来自中国|Tôi làm việc tại công ty này=我在这家公司工作|Tôi đang học tiếng Việt=我正在学越南语|Rất vui được làm quen=很高兴认识您'],
    ['同事与朋友', '“đây là…”用于介绍身边的人；“của tôi”表示“我的”。', 'Đây là đồng nghiệp của tôi=这是我的同事|Đây là bạn của tôi=这是我的朋友|Anh ấy làm việc ở Hà Nội=他在河内工作|Chị ấy nói tiếng Việt=她说越南语|Chúng tôi làm việc cùng nhau=我们一起工作'],
    ['继续交流', '用简短问句了解对方，再用完整句回答。', 'Anh sống ở đâu=您住在哪里（男性）|Chị có nói tiếng Trung không=您会说中文吗（女性）|Tôi nói một chút tiếng Việt=我会说一点越南语|Xin hãy nói chậm hơn=请说慢一点|Tôi chưa hiểu=我还没听懂'],
  ]],
  ['时间与安排', '日常', '⏰', [
    ['日期与时间', '“hôm nay”是今天，“ngày mai”是明天；询问日期和时间时，回答要根据实际情况变化。', 'Hôm nay là thứ mấy=今天星期几|Ngày mai là thứ mấy=明天星期几|Bây giờ là mấy giờ=现在几点|Buổi sáng tôi có thời gian=我上午有时间|Buổi chiều tôi bận=我下午忙'],
    ['约见面', '“chúng ta”包括说话人与听话人，适合约共同活动。', 'Chúng ta gặp nhau lúc mấy giờ=我们几点见面|Chúng ta gặp nhau vào ngày mai=我们明天见面|Anh có rảnh không=您有空吗（男性）|Tôi có thể đến lúc hai giờ=我两点可以到|Hẹn gặp lại ngày mai=明天见'],
    ['改变计划', '更改安排时说明原因，并给出新的时间。', 'Tôi muốn đổi lịch hẹn=我想改预约时间|Hôm nay tôi đến muộn=我今天会迟到|Cuộc họp bắt đầu lúc mười giờ=会议十点开始|Chúng ta có thể gặp vào thứ sáu không=我们周五见可以吗|Xin xác nhận thời gian=请确认时间'],
  ]],
  ['餐饮与购物', '日常', '🍜', [
    ['点餐', '“cho tôi…”可以用来礼貌地提出点单需求。', 'Cho tôi một bát phở=请给我一碗河粉|Cho tôi một cốc nước=请给我一杯水|Tôi muốn xem thực đơn=我想看菜单|Món này có cay không=这道菜辣吗|Tôi không ăn cay=我不吃辣'],
    ['口味与需求', '清楚表达喜好和限制，避免只用“có/không”回答。', 'Món này rất ngon=这道菜很好吃|Tôi muốn ít đường=我想少放糖|Tôi ăn chay=我吃素|Cho tôi thêm nước=请再给我一些水|Tôi muốn mang đi=我想打包带走'],
    ['付款与购物', '价格表达常用“bao nhiêu tiền”；购物时注意数量。', 'Tổng cộng bao nhiêu tiền=一共多少钱|Tôi muốn trả bằng thẻ=我想刷卡付款|Tôi trả bằng tiền mặt=我付现金|Có hóa đơn không=有发票吗|Cho tôi xem cái này=请让我看看这个'],
  ]],
  ['出行与住宿', '日常', '🧭', [
    ['交通方式', '“đến”表示到达目的地；“bằng”可引出交通方式。', 'Tôi muốn đến sân bay=我想去机场|Tôi đi bằng taxi=我坐出租车|Ga tàu ở đâu=火车站在哪里|Xe buýt này đi đâu=这辆公交车去哪儿|Tôi xuống ở đây=我在这里下车'],
    ['问路', '“rẽ trái”左转，“rẽ phải”右转；可以请对方重复。', 'Xin hỏi đường đến khách sạn=请问去酒店怎么走|Đi thẳng=直走|Rẽ trái ở ngã tư=在十字路口左转|Rẽ phải ở đây=在这里右转|Có xa không=远吗'],
    ['住酒店', '入住时准备姓名和预订信息。', 'Tôi đã đặt phòng=我已经订房了|Tôi muốn nhận phòng=我想办理入住|Phòng của tôi ở đâu=我的房间在哪里|Mấy giờ trả phòng=几点退房|Tôi cần thêm một chiếc khăn=我需要再要一条毛巾'],
  ]],
  ['客户初次接洽', '销售', '💬', [
    ['介绍公司', '商务介绍先说公司身份，再说主营产品。', 'Chúng tôi là nhà sản xuất đèn=我们是灯具制造商|Công ty chúng tôi ở Trung Quốc=我们公司在中国|Chúng tôi cung cấp giải pháp chiếu sáng=我们提供照明解决方案|Đây là danh mục sản phẩm=这是产品目录|Rất vui được hợp tác với quý công ty=很高兴与贵公司合作'],
    ['了解需求', '“quý công ty”是对对方公司的礼貌称呼。', 'Quý công ty cần loại đèn nào=贵公司需要哪类灯具|Dự án ở đâu=项目在哪里|Quý công ty cần bao nhiêu bộ=贵公司需要多少套|Khi nào quý công ty cần hàng=贵公司何时需要货|Xin cho biết yêu cầu của dự án=请告知项目要求'],
    ['确认询盘', '在给出方案前，复述数量、场景和时间。', 'Tôi đã nhận được yêu cầu của anh=我已收到您的需求（男性）|Xin gửi bản vẽ cho chúng tôi=请把图纸发给我们|Chúng tôi sẽ xem xét yêu cầu=我们会评估需求|Tôi muốn xác nhận số lượng=我想确认数量|Tôi sẽ trả lời qua email=我会通过邮件回复'],
  ]],
  ['照明产品与规格', '销售', '💡', [
    ['产品类型', '先分清产品用途，再讨论技术参数。', 'Đây là đèn LED=这是 LED 灯|Đây là đèn đường=这是路灯|Đây là đèn pha=这是投光灯|Đây là đèn nhà xưởng=这是工矿灯|Đây là đèn chiếu sáng trong nhà=这是室内照明灯'],
    ['电气参数', '询问电压、功率时，要确认数值和单位。', 'Công suất là bao nhiêu watt=功率是多少瓦|Điện áp là bao nhiêu vôn=电压是多少伏|Đèn này có thể điều chỉnh độ sáng=这款灯可以调光|Tuổi thọ dự kiến là bao lâu=预计寿命有多长|Xin xác nhận thông số kỹ thuật=请确认技术参数'],
    ['光学与安装', '“quang thông”是光通量；“nhiệt độ màu”是色温。', 'Quang thông là bao nhiêu lumen=光通量是多少流明|Nhiệt độ màu là bao nhiêu=色温是多少|Góc chiếu là bao nhiêu độ=光束角是多少度|Đèn được lắp ở độ cao nào=灯具安装在多高处|Đèn này dùng ngoài trời=这款灯用于户外'],
  ]],
  ['报价与商务条款', '销售', '💰', [
    ['价格与数量', '报价必须同时确认币种、数量和价格口径。', 'Xin gửi báo giá cho chúng tôi=请给我们发送报价|Giá này tính bằng đô la Mỹ=这个价格以美元计|Đơn giá là bao nhiêu=单价是多少|Số lượng đặt hàng tối thiểu là bao nhiêu=最小起订量是多少|Giá đã bao gồm thuế chưa=价格含税了吗'],
    ['样品与订单', '样品确认后再谈量产订单。', 'Chúng tôi muốn đặt mẫu=我们想订样品|Khi nào mẫu sẵn sàng=样品何时准备好|Xin xác nhận đơn đặt hàng=请确认订单|Chúng tôi cần hợp đồng=我们需要合同|Số lượng trong đơn hàng là bao nhiêu=订单中的数量是多少'],
    ['付款条件', '“đặt cọc”是订金；付款条件要写入正式单据。', 'Điều kiện thanh toán là gì=付款条件是什么|Chúng tôi sẽ trả tiền đặt cọc=我们会支付订金|Xin gửi hóa đơn thương mại=请发送商业发票|Hạn thanh toán là khi nào=付款截止日是什么时候|Chúng ta cần xác nhận bằng văn bản=我们需要书面确认'],
  ]],
  ['交期与售后', '销售', '📦', [
    ['交货计划', '交期沟通要区分生产完成、发货和到货。', 'Thời gian giao hàng là bao lâu=交货周期有多长|Hàng sẽ sẵn sàng vào tuần tới=货下周会准备好|Xin xác nhận ngày giao hàng=请确认交货日期|Chúng tôi cần giao hàng đúng hạn=我们需要按时交货|Có thể giao hàng sớm hơn không=可以提前交货吗'],
    ['运输沟通', '发货后及时提供单据和物流信息。', 'Hàng đã được gửi đi=货已经发出|Xin gửi mã vận đơn=请发送运单号|Hàng sẽ đến cảng nào=货会到哪个港口|Xin gửi danh sách đóng gói=请发送装箱单|Chúng tôi sẽ theo dõi lô hàng=我们会跟踪这批货'],
    ['保修与问题', '售后问题先确认批次和现象，再讨论处理方案。', 'Thời hạn bảo hành là bao lâu=保修期有多长|Đèn này không hoạt động=这盏灯不工作|Xin gửi ảnh sản phẩm bị lỗi=请发送故障产品的照片|Chúng tôi sẽ kiểm tra vấn đề=我们会检查问题|Chúng tôi sẽ đề xuất giải pháp=我们会提出解决方案'],
  ]],
  ['生产计划', '供应链', '🏭', [
    ['计划排产', '用明确日期沟通排产和产能。', 'Nhà máy đã nhận đơn hàng=工厂已收到订单|Khi nào bắt đầu sản xuất=什么时候开始生产|Kế hoạch sản xuất đã được xác nhận=生产计划已确认|Công suất sản xuất mỗi ngày là bao nhiêu=每天的产能是多少|Chúng tôi cần cập nhật tiến độ=我们需要更新进度'],
    ['物料准备', '物料短缺要尽早说明影响和替代方案。', 'Nguyên vật liệu đã sẵn sàng=原材料已准备好|Chúng tôi đang chờ linh kiện=我们正在等零部件|Số lượng linh kiện chưa đủ=零部件数量不足|Khi nào vật liệu đến nhà máy=材料什么时候到工厂|Cần kiểm tra linh kiện trước khi lắp ráp=组装前需要检查零部件'],
    ['生产异常', '汇报问题时说清影响范围与预计恢复时间。', 'Dây chuyền đang tạm dừng=产线暂时停工|Chúng tôi gặp vấn đề về vật liệu=我们遇到了材料问题|Tiến độ đang chậm hơn kế hoạch=进度比计划慢|Chúng tôi đang tìm giải pháp=我们正在寻找解决方案|Xin thông báo thời gian hoàn thành mới=请告知新的完成时间'],
  ]],
  ['组装与质检', '供应链', '🔍', [
    ['组装作业', '“lắp ráp”是组装，“kiểm tra”是检查。', 'Chúng tôi bắt đầu lắp ráp=我们开始组装|Hãy kiểm tra bảng mạch=请检查电路板|Hãy lắp bộ nguồn vào đèn=请把电源装入灯具|Sản phẩm đã được lắp ráp xong=产品已组装完成|Cần thử đèn trước khi đóng gói=包装前需要测试灯具'],
    ['质量检查', '检验结果应有记录，不能只凭口头确认。', 'Chúng tôi đang kiểm tra chất lượng=我们正在检查质量|Xin gửi báo cáo kiểm tra=请发送检验报告|Tỷ lệ lỗi là bao nhiêu=不良率是多少|Sản phẩm này đạt yêu cầu=这件产品符合要求|Sản phẩm này không đạt yêu cầu=这件产品不符合要求'],
    ['缺陷处理', '描述缺陷时说明批次、数量和现象。', 'Có bao nhiêu sản phẩm bị lỗi=有多少件产品有缺陷|Lỗi này xuất hiện ở lô nào=这个缺陷出现在哪个批次|Chúng tôi cần phân tích nguyên nhân=我们需要分析原因|Hãy tách riêng sản phẩm bị lỗi=请将不良品单独隔离|Chúng tôi sẽ kiểm tra lại=我们会重新检查'],
  ]],
  ['采购与物流', '供应链', '🚚', [
    ['采购跟进', '采购沟通要落实供应商、数量和到料日。', 'Đã gửi đơn đặt hàng cho nhà cung cấp=已向供应商发送采购订单|Nhà cung cấp đã xác nhận số lượng=供应商已确认数量|Khi nào linh kiện được giao=零部件什么时候交付|Giá nguyên vật liệu đã thay đổi=原材料价格已变化|Chúng tôi cần nhà cung cấp thay thế=我们需要替代供应商'],
    ['包装与标签', '出货前核对箱数、标签和装箱单。', 'Hãy kiểm tra nhãn trên thùng=请检查箱子上的标签|Có bao nhiêu thùng hàng=有多少箱货|Sản phẩm đã được đóng gói=产品已包装好|Xin xác nhận kích thước thùng=请确认箱子尺寸|Danh sách đóng gói đã sẵn sàng=装箱单已准备好'],
    ['物流协调', '运输延误时，先确认新预计到达时间。', 'Xe tải đã đến nhà máy=卡车已经到厂|Hàng đang trên đường đến cảng=货正在运往港口|Lô hàng bị chậm=这批货延误了|Ngày đến dự kiến là khi nào=预计到达日期是什么时候|Xin cập nhật tình trạng vận chuyển=请更新运输状态'],
  ]],
  ['真实商务对话', '供应链', '🏁', [
    ['会议沟通', '在会议中先确认目标，再逐项确认负责人。', 'Chúng ta bắt đầu cuộc họp=我们开始开会|Mục tiêu của cuộc họp là gì=会议目标是什么|Xin trình bày tiến độ dự án=请介绍项目进度|Ai phụ trách việc này=谁负责这件事|Xin ghi lại các quyết định=请记录各项决定'],
    ['协商方案', '提出变更时说明原因，并征求对方确认。', 'Chúng tôi đề xuất phương án này=我们建议这个方案|Quý công ty có đồng ý không=贵公司同意吗|Chúng ta cần thảo luận thêm=我们需要进一步讨论|Chi phí sẽ thay đổi=成本会发生变化|Xin xác nhận phương án cuối cùng=请确认最终方案'],
    ['邮件跟进', '用书面总结把口头沟通变成可追踪的行动。', 'Cảm ơn anh đã tham gia cuộc họp=感谢您参加会议（男性）|Tôi gửi biên bản cuộc họp=我发送会议纪要|Xin kiểm tra tài liệu đính kèm=请查看附件|Chúng tôi sẽ cập nhật vào ngày mai=我们明天会更新|Mong sớm nhận được phản hồi=期待尽快收到回复'],
  ]],
];

const AUDIO = {
  'Việt Nam': {
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Vietnam.ogg',
    source: 'https://commons.wikimedia.org/wiki/File:Vietnam.ogg',
    author: 'Grenouille vert',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    accent: 'Northern',
    modified: false,
  },
};

export const units = RAW.map(([title, category, icon, lessons], unitIndex) => ({
  id: `u${unitIndex + 1}`,
  title,
  category,
  icon,
  lessons: lessons.map(([name, note, raw], lessonIndex) => ({
    id: `u${unitIndex + 1}l${lessonIndex + 1}`,
    unitId: `u${unitIndex + 1}`,
    title: name,
    note,
    phrases: raw.split('|').map((part, phraseIndex) => {
      const [vi, zh] = part.split('=');
      return { id: `u${unitIndex + 1}l${lessonIndex + 1}p${phraseIndex + 1}`, vi, zh, audio: AUDIO[vi] || null };
    }),
  })),
}));

export const lessons = units.flatMap(unit => unit.lessons);
export const phrases = lessons.flatMap(lesson => lesson.phrases);
