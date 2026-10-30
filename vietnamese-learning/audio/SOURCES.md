# 内置越南语合成音频

这些文件是文字转语音生成的音频，**不是北部真人录音，也不是母语教师发音认证**。课程 IPA 沿用北部越南语参考；合成声音的具体地域口音未独立认证。

- 模型：`vi_VN-vais1000-medium`，模型发布维护者 **Michael Hansen / Rhasspy**。
- 原始模型卡：[Piper VAIS-1000](https://huggingface.co/rhasspy/piper-voices/blob/main/vi/vi_VN/vais1000/medium/MODEL_CARD)。模型仓库元数据标注 MIT。
- 训练数据：**VAIS-1000** 越南语语音合成语料库，原始数据发布者与署名见 [IEEE DataPort 数据页](https://ieee-dataport.org/documents/vais-1000-vietnamese-speech-synthesis-corpus)。模型卡标注数据许可为 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。保留该来源、署名链接及许可记录。
- 下载分发：[k2-fsa / sherpa-onnx 的 Piper 越南语转换模型](https://k2-fsa.github.io/sherpa/onnx/tts/all/Vietnamese/vits-piper-vi_VN-vais1000-medium.html)。下载的压缩包已与该项目发布资产 SHA256 核对。
- 生成工具：[Piper 1.8.0](https://github.com/OHF-Voice/piper1-gpl)，GPL-3.0；网站不包含该程序或模型权重，仅提供生成的音频与播放代码。
- 制作与修改：逐条按本站课程文字生成，保留发音前后余量，插入分段间隔，再编码为 AAC/M4A。课程、词块、音节分别生成，未从整句中粗略剪切音节。
- 逐条记录：`manifest.json` 包含每一项原文、音频文件、起点、时长和 sourceId；公共 source 对象记录以上作者与许可。每个音频文件另有 SHA256，用于核对内容完整性。

课程中已核实的“Việt Nam”真人录音仍按其原有 CC BY-SA 3.0 许可优先播放；网络不可用时使用本音频库的合成版本备用。真人录音来源与作者保留在 course.js 及学习记录页。
