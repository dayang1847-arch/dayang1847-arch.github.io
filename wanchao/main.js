import * as Data from './game-data.js';
import { createGame, applyCommand, stepGame, snapshotFor, driveBots } from './game-engine.js';
import { Battlefield } from './battlefield.js';
import { mergeSnapshot } from './network-state.js';

const { WORLD, FACTIONS, UNITS, BUILDINGS } = Data;
const PREFIX = 'dc-wanchao:';
const words = {
  brand: ['万朝逐鹿', 'Clash of Dynasties'],
  title: ['万朝逐鹿', 'Clash of Dynasties'],
  tagline: ['一张山河图，六种逐鹿之道。', 'One realm. Six paths to the throne.'],
  skip: ['跳到战场', 'Skip to battlefield'],
  skipPrepare: ['跳到开战准备', 'Skip to campaign preparation'],
  battlefieldLabel: ['天下沙盘', 'The realm'],
  previewTitle: ['群雄未起 · 静候军令', 'The realm awaits your command'],
  prepareBattle: ['开战准备', 'Prepare your campaign'],
  prepareEyebrow: ['战前筹备', 'BEFORE THE BATTLE'],
  coverEyebrow: ['天下为局 · 群雄逐鹿', 'DYNASTIES AT WAR'],
  coverTitle: ['万朝逐鹿', 'Clash of Dynasties'],
  coverLead: ['六朝交锋，一统山河。', 'Six dynasties. One throne.'],
  coverMeta: ['{n} 座真实城池 · 实时战略 · 2–4 人联机', '{n} real cities · Real-time strategy · 2–4 players'],
  coverBegin: ['进入练兵', 'Enter practice'],
  coverViewMap: ['先看山河图', 'Explore the map'],
  coverReturn: ['返回封面', 'Show cover'],
  coverArtAlt: ['万朝逐鹿的史诗风格封面插画', 'Epic cover illustration for Clash of Dynasties'],
  coverRoute: ['选朝代 → 发展主城 → 攻城掠地 → 争夺王都', 'Choose a dynasty → Grow your citadel → Capture cities → Contest the capital'],
  coverRouteDetail: ['发展经济、征募军队，逐步扩张你的势力。', 'Build an economy, recruit troops, and expand your realm.'],
  coverStartHint: ['先选朝代，再进入练兵或创建房间。', 'Choose a dynasty, then enter practice or create a room.'],
  mapName: ['亚洲山河', 'Realms of Asia'],
  mapSubtitle: ['{n} 座真实城市 · 四方起兵', '{n} real cities · Four starting frontiers'],
  friendly: ['己方', 'Friendly'],
  hostile: ['敌方', 'Hostile'],
  mapNote: ['真实亚洲地理 · 游戏化疆界', 'Asian geography · Borders designed for gameplay'],
  matchStatus: ['对局状态', 'Battle status'],
  battlefieldArea: ['实时战场', 'Live battlefield'],
  canvasLabel: ['战场地图。左键拖动地图，单击选择；Shift 拖动或切换框选模式选择部队，右键移动或攻击。中键或按住空格拖动也可平移。手机单指拖动、双指缩放；双击城池放大。征战页可用键盘搜索城市，Home 返回主城。', 'Battlefield map. Drag to pan and click to select. Shift-drag or use selection mode to select troops; right-click to move or attack. Middle-drag or Space-drag also pans. On mobile, drag with one finger and pinch with two. Double-click cities to zoom. Campaign search supports the keyboard; Home centers your base.'],
  strategyPanel: ['军政面板', 'Strategy panel'],
  militaryActions: ['军政操作', 'Military actions'],
  geographyHint: ['亚洲轮廓、{n} 座城池的现代地名与真实经纬度参考 Natural Earth。地图分为 {regions} 个游戏地域，地域名借用古代地理名称，疆界与归属为游戏设定。', 'Asian outlines, {n} modern place names, and their real coordinates reference Natural Earth. The map has {regions} game regions using historical geographic names; borders and ownership are game settings.'],
  territory: ['疆域', 'Territories'],
  territoryCount: ['疆域 {n} / {total}', 'Territories {n} / {total}'],
  economicCities: ['经济外城 {n} / 3', 'Economic cities {n} / 3'],
  frontierFort: ['边塞据点', 'Frontier fort'],
  territorySituation: ['{n} 地域局势', 'Situation across {n} regions'],
  territorySummaryTitle: ['{n} 地域局势', 'Situation across {n} regions'],
  territoryHint: ['每个地域显示我方已控城池与总数；选择地域聚焦其控制中心。', 'Each region shows your controlled cities and total cities. Select a region to focus its control center.'],
  regionControlled: ['已控 {owned} / {total} 城', 'Held {owned} / {total} cities'],
  controlCenter: ['控制中心', 'Control center'],
  citiesControlled: ['城池 {owned} / {total}', 'Cities {owned} / {total}'],
  citySearch: ['查找真实城池', 'Find real cities'],
  cityCatalogCount: ['真实地名城池 · 共 {n} 座', 'Real place-name cities · {n} in total'],
  citySearchPlaceholder: ['中文 / English 地名', 'Chinese / English place name'],
  citySearchHint: ['中英地名检索，最多展示 20 座；选择结果查看并聚焦。', 'Search Chinese or English names. Up to 20 cities are shown; select one to inspect and focus.'],
  citySearchResults: ['匹配 {matched} 座 · 显示 {shown} 座 / 全图 {total} 座', '{matched} matches · Showing {shown} / {total} cities on the map'],
  citySearchEmpty: ['没有匹配城池。试试英文源地名，或关闭精确匹配。', 'No matching cities. Try the English source name, or turn off exact matching.'],
  exactSearch: ['精确匹配', 'Exact name'],
  portsOnly: ['只看港口', 'Ports only'],
  citySearchStart: ['输入地名，或筛选地域 / 港口，查找全图 {n} 座城池。', 'Enter a place name, or filter regions / ports, to find any of the map’s {n} cities.'],
  allRegions: ['全部地域', 'All regions'],
  regionFilter: ['限定地域', 'Filter by region'],
  townRegion: ['城镇 · 微量收入', 'Town · Small income'],
  townHint: ['普通城镇提供微量收入；不计入称帝所需的 3 座经济城。', 'Ordinary towns provide small income and do not count toward the 3 economic cities required for the throne.'],
  port: ['港口', 'Port'],
  portTransport: ['港口运输', 'Port transport'],
  portOwned: ['我方出发港', 'Your departure port'],
  portNotOwned: ['先占领此港，才能从这里出航。', 'Capture this port before using it for departure.'],
  portGuide: ['先占港口，再右键海岛城市。军队会沿可达港口航线自动运输，登陆后继续执行命令。', 'Capture a port, then right-click an island city. Troops travel automatically along available port routes and continue their orders after landing.'],
  portTargets: ['直达目标港 · {n} 座', 'Direct destination ports · {n}'],
  portNoRoutes: ['此港没有直达航线。可先占领其他有航线的港口。', 'This port has no direct routes. Capture another port with a route first.'],
  portTargetsMore: ['另有 {n} 座目标港，可在城池搜索中查找。', '{n} more destination ports can be found with city search.'],
  seaTransit: ['海运中', 'At sea'],
  transitDetail: ['{name} → {port} · 预计 {n} 秒后登陆', '{name} → {port} · Landing in approximately {n}s'],
  transitSummary: ['海运中的编队：{n}', 'Squads at sea: {n}'],
  transitWait: ['等待登陆后再使用技能。', 'Wait until landing to use a skill.'],
  transitOrdersWait: ['海运中的部队请等待登陆后再下令。', 'Wait until troops land before issuing new orders.'],
  coordinates: ['真实经纬度', 'Real coordinates'],
  sourcePlace: ['源地名', 'Source place name'],
  sourceRecord: ['地名数据记录', 'Place-name record'],
  sourceDetails: ['查看地名来源', 'Place-name source details'],
  foodRegion: ['粮草产地', 'Food region'],
  silverRegion: ['银两商镇', 'Silver market'],
  capitalRegion: ['称帝王都', 'Imperial capital'],
  fortRegion: ['边塞补给', 'Frontier supply'],
  inspectCityLabel: ['{region}，{owner}，{kind}；查看并聚焦{city}', '{region}, {owner}, {kind}; inspect and focus {city}'],
  awaitCommand: ['待君发令', 'Awaiting your command'],
  selectionHint: ['选择一支军队，或点击城池查看局势。', 'Select an army, or inspect a city.'],
  select: ['选择', 'Select'],
  command: ['下令', 'Command'],
  controlHint: ['拖动地图 · Shift 框选 · 右键下令 · 手机双指缩放', 'Drag to pan · Shift-drag selects · Right-click orders · Pinch to zoom'],
  mapGestureHint: ['拖动平移 · Shift 框选 · 单击查看；手机单指拖动、双指缩放', 'Drag to pan · Shift-drag to select · Click to inspect; touch: drag / pinch'],
  matchFormat: ['2–4 人 · 实时战略', '2–4 players · Real-time strategy'],
  commandCenter: ['军政司', 'Command center'],
  panelTitle: ['谋定而后动', 'Plan your campaign'],
  tabLobby: ['开局', 'Campaign'],
  tabBuild: ['建设', 'Build'],
  tabTrain: ['征兵', 'Recruit'],
  tabTech: ['科技', 'Technology'],
  dispatch: ['军情简报', 'Battle reports'],
  dispatchEmpty: ['烽火未起，先定谋略。', 'A quiet realm. Prepare your strategy.'],
  footerGame: ['万朝逐鹿 / 跨朝代实时战略', 'Clash of Dynasties / Cross-era real-time strategy'],
  loading: ['正在展开山河图…', 'Unfolding the realm…'],
  notConnected: ['尚未开局', 'No active battle'],
  ruler: ['君主', 'Ruler'],
  elite: ['专属兵种', 'Unique unit'],
  passive: ['阵营特色', 'Faction trait'],
  heroesLimit: ['武将已在场或正在征募', 'Your hero is deployed or being recruited'],
  trainingFull: ['征兵队列已满', 'Recruitment queue is full'],
  researchBusy: ['请等待当前研发完成', 'Wait for the current research to finish'],
  cityUnseen: ['派兵侦察后可查看城池情况。', 'Scout this city to reveal its current state.'],
  timedDraw: ['战局时限已到。', 'The battle time limit was reached.'],
  gameSubtitle: ['跨越朝代，争夺天下', 'Across dynasties. One throne.'],
  preview: ['沙盘预览', 'Battlefield preview'],
  previewHint: ['选择一个朝代，开始你的第一场征战。', 'Choose a dynasty and begin your first campaign.'],
  practice: ['单人练兵', 'Practice with AI'],
  practiceHint: ['无需服务器，立即与 AI 交战。', 'Play against AI directly in your browser.'],
  startPractice: ['开始练兵', 'Start practice'],
  bots: ['AI 对手', 'AI opponents'],
  botCount: ['{n} 名 AI', '{n} AI opponents'],
  you: ['你', 'You'],
  ai: ['AI', 'AI'],
  aiName: ['{faction} · 电脑', '{faction} · AI'],
  commanderName: ['主公名号', 'Commander name'],
  namePlaceholder: ['输入你的名号', 'Your commander name'],
  defaultName: ['无名主公', 'Commander'],
  faction: ['选择朝代', 'Choose a dynasty'],
  factionHint: ['跨时代对战采用游戏化平衡，兵种各有克制。', 'Cross-era armies use game balance and unit counters.'],
  friends: ['朋友联机', 'Play with friends'],
  friendsHint: ['2–4 人实时对战，房主开局。', 'Real-time battles for 2–4 players, started by the host.'],
  createRoom: ['创建房间', 'Create room'],
  joinRoom: ['加入房间', 'Join room'],
  roomCode: ['房间码', 'Room code'],
  roomCodePlaceholder: ['输入房间码', 'Enter room code'],
  room: ['房间 {code}', 'Room {code}'],
  copyCode: ['复制房间码', 'Copy room code'],
  copyInvite: ['复制邀请链接', 'Copy invite link'],
  copied: ['已复制', 'Copied'],
  copyFailed: ['无法自动复制，请选中并复制显示的内容。', 'Automatic copying is unavailable. Select and copy the displayed text.'],
  host: ['房主', 'Host'],
  ready: ['已准备', 'Ready'],
  notReady: ['未准备', 'Not ready'],
  readyButton: ['准备', 'Ready up'],
  unreadyButton: ['取消准备', 'Unready'],
  startMatch: ['开战', 'Start battle'],
  startNeedsPlayers: ['需要至少 2 名玩家，并且房间内所有玩家都已连接并准备。', 'At least 2 players are required, and everyone in the room must be connected and ready.'],
  waitingHost: ['等待房主开战', 'Waiting for the host'],
  roomLocked: ['对局进行中，阵营已锁定。', 'A battle is in progress. Factions are locked.'],
  connected: ['已连接', 'Connected'],
  disconnected: ['已断开', 'Disconnected'],
  offline: ['本地练兵', 'Local practice'],
  noService: ['联机服务未配置', 'Multiplayer server not configured'],
  noServiceHint: ['此静态站点需要独立的联机服务。你可以先练兵，或填写服务地址后邀请朋友。', 'This static site needs a multiplayer server. Practice now, or configure a server to invite friends.'],
  configureService: ['配置联机服务', 'Configure multiplayer server'],
  serviceUrl: ['联机服务地址', 'Multiplayer server URL'],
  serviceUrlPlaceholder: ['https://你的联机服务地址', 'https://your-game-server.example'],
  serviceHint: ['使用部署好的游戏服务地址；HTTPS 页面需要 HTTPS 服务。留空使用本站服务。', 'Use a deployed game server. HTTPS pages require an HTTPS server. Leave empty to use this site.'],
  saveService: ['保存服务地址', 'Save server URL'],
  serviceSaved: ['联机服务设置已保存。', 'Multiplayer server settings saved.'],
  invalidService: ['请输入有效的 HTTP 或 HTTPS 服务地址。', 'Enter a valid HTTP or HTTPS server URL.'],
  insecureService: ['HTTPS 页面不能连接 HTTP 服务，请使用 HTTPS 地址。', 'An HTTPS page requires an HTTPS server URL.'],
  connecting: ['正在连接…', 'Connecting…'],
  reconnecting: ['正在重连 · {n} 秒', 'Reconnecting · {n}s'],
  reconnected: ['连接已恢复，战场已同步。', 'Connection restored. Battlefield synchronized.'],
  reconnectFailed: ['60 秒内未能恢复连接。可重试连接，或返回首页。', 'Could not reconnect within 60 seconds. Retry or return home.'],
  mapUpdated: ['地图版本已更新，旧对局已重置；房间成员保留，请重新准备。', 'The map version changed and the previous battle was reset. Room members remain; ready up again.'],
  mapMismatch: ['客户端与联机服务地图版本不一致。请刷新页面；若仍不同，请更新联机服务。', 'The client and server use different map versions. Refresh this page; if they still differ, update the game server.'],
  mapMismatchShort: ['地图版本不一致', 'Map versions differ'],
  refreshPage: ['刷新页面', 'Refresh page'],
  reconnect: ['重新连接', 'Reconnect'],
  resumeRoom: ['恢复上次房间', 'Resume previous room'],
  leaveRoom: ['离开房间', 'Leave room'],
  networkError: ['连接失败，请检查服务地址与网络。', 'Connection failed. Check your server URL and network.'],
  requestFailed: ['服务请求失败（{status}）。', 'Server request failed ({status}).'],
  roomInvalid: ['请输入有效的房间码。', 'Enter a valid room code.'],
  nameRequired: ['请先输入主公名号。', 'Enter a commander name first.'],
  lobby: ['征战', 'Campaign'],
  build: ['建设', 'Build'],
  train: ['征兵', 'Recruit'],
  tech: ['科技', 'Technology'],
  food: ['粮草', 'Food'],
  silver: ['银两', 'Silver'],
  army: ['兵力', 'Army'],
  level: ['等级', 'Tier'],
  tier: ['{n} 级', 'Tier {n}'],
  time: ['战局时间', 'Battle time'],
  cost: ['{food} 粮 · {silver} 银', '{food} food · {silver} silver'],
  seconds: ['{n} 秒', '{n}s'],
  selected: ['已选中', 'Selected'],
  selectedUnits: ['{n} 支部队', '{n} units'],
  selectedNothing: ['拖动地图查看山河，单击看详情；Shift 拖动或切换框选模式选择部队。', 'Drag to explore and click for details. Shift-drag or use selection mode to select troops.'],
  own: ['我方', 'Your forces'],
  enemy: ['敌方', 'Enemy'],
  neutral: ['中立', 'Neutral'],
  health: ['生命', 'Health'],
  guard: ['守军', 'Garrison'],
  queue: ['队列', 'Queue'],
  constructing: ['建造中 · {n}%', 'Building · {n}%'],
  selectedBuilding: ['选择建筑后可查看生产队列。', 'Select a building to inspect its production queue.'],
  buildHint: ['选建筑，再单击主城、营地或已整顿且连通的城池附近空地；必须在同一陆地。拖动只移动视角，Esc 取消选址。', 'Choose a building, then click open ground near your base, camp, or a secured connected city on the same landmass. Dragging pans; Esc cancels placement.'],
  trainHint: ['选择兵种即可征募；选中兵营等建筑可指定出兵位置。枪兵保护弓兵，骑兵绕后，器械破城。', 'Choose a unit to recruit. Select a military building to choose where it deploys. Spears screen archers, cavalry flank, and siege engines break cities.'],
  needsTier: ['需要 {n} 级主城', 'Requires a tier {n} base'],
  needsBuilding: ['需要已完成的{building}', 'Requires a completed {building}'],
  noResources: ['粮草或银两不足', 'Not enough food or silver'],
  capacityFull: ['兵力容量（含征募队列）已满，先建造民居', 'Capacity includes recruiting units. Build housing first'],
  buildingLimit: ['已达到该建筑数量上限', 'Building limit reached'],
  yuanOnly: ['仅元朝可建造', 'Available only to Yuan'],
  onlyOwned: ['只能指挥自己的部队。', 'You can command only your own units.'],
  cannotCommand: ['当前无法下达命令。', 'Commands are unavailable right now.'],
  placement: ['选址：{name} · 左键建造 · Esc 取消', 'Place {name} · Click to build · Esc cancels'],
  skillPlacement: ['选择技能目标 · 左键施放 · Esc 取消', 'Choose a skill target · Click to cast · Esc cancels'],
  packPlacement: ['选择迁营地点 · 左键确认 · Esc 取消', 'Choose a camp destination · Click to confirm · Esc cancels'],
  commandFailed: ['命令未执行：{error}', 'Command rejected: {error}'],
  commandSent: ['命令已发送', 'Command sent'],
  baseUpgrade: ['升级主城', 'Upgrade base'],
  upgradeHint: ['主城升级解锁更高级的兵种与建筑。', 'Base upgrades unlock advanced units and buildings.'],
  maxLevel: ['主城已达到最高等级', 'Base is at maximum tier'],
  researching: ['研发中', 'Researching'],
  migrating: ['迁营中 · {n} 秒', 'Relocating · {n}s'],
  trainingBusy: ['等待军营征兵完成', 'Wait for the camp recruitment queue'],
  armyBreakdown: ['已出征 {deployed} · 征募中 {queued} · 容量 {capacity} · 武将 {heroes}', 'Deployed {deployed} · Recruiting {queued} · Capacity {capacity} · Heroes {heroes}'],
  researched: ['已完成', 'Completed'],
  upgrading: ['主城升级中', 'Base upgrading'],
  researchHint: ['二级主城解锁科技，每项只研究一次。研发同时只进行一项，完成后持续生效。', 'Tier 2 unlocks technology. Each upgrade is researched once, one at a time, and remains active after completion.'],
  hold: ['原地驻守 · H', 'Hold position · H'],
  focus: ['聚焦', 'Focus'],
  skill: ['武将技能 · Q', 'Hero skill · Q'],
  skillReady: ['技能可用', 'Skill ready'],
  cooldown: ['冷却 {n} 秒', 'Cooldown {n}s'],
  migrate: ['迁移营地', 'Move camp'],
  groups: ['编队：Ctrl / ⌘ + 1–5 保存，1–5 调用', 'Groups: Ctrl / ⌘ + 1–5 save, 1–5 select'],
  groupSaved: ['已保存编队 {n}：{count} 支部队', 'Saved group {n}: {count} units'],
  groupEmpty: ['编队 {n} 暂无部队', 'Group {n} is empty'],
  groupNeedsUnits: ['先选中自己的部队，再保存编队。', 'Select your units before saving a group.'],
  city: ['城池', 'City'],
  capital: ['王都', 'Imperial capital'],
  capturing: ['正在占领 · {n}%', 'Capturing · {n}%'],
  settling: ['占领稳定中 · {n} 秒', 'Securing city · {n}s'],
  connectedCity: ['已连通', 'Connected'],
  cutOffCity: ['尚未连通', 'Disconnected'],
  cityHint: ['击败守军与城防，留兵 {capture} 秒占领；再整顿 {settle} 秒。', 'Defeat the garrison and city defenses, then keep troops nearby for {capture}s to capture; securing takes another {settle}s.'],
  citySupplyHint: ['整顿后还需连通己方补给网，才有收入、补给和前线建设。连通与整顿不影响称帝资格。', 'After securing, connect the city to your supply network for income, recovery, and forward construction. Securing and supply connection are not throne requirements.'],
  cityFoodUse: ['全图 {n} 座粮草经济城：整顿且连通后产粮，占领后计入称帝的 3 座经济城。', 'One of {n} food economic cities: produces food once secured and connected, and counts toward the 3 economic cities for the throne.'],
  citySilverUse: ['全图 {n} 座银两经济城：整顿且连通后产银，占领后计入称帝的 3 座经济城。', 'One of {n} silver economic cities: produces silver once secured and connected, and counts toward the 3 economic cities for the throne.'],
  cityTownUse: ['普通城镇整顿且连通后，每秒粮草、银两各 +{income}；不计入称帝所需经济城。', 'A secured connected town adds {income} food and silver per second; it does not count as a throne economic city.'],
  cityFortUse: ['边塞据点整顿且连通后提供补给与建设落点，不直接产粮银，也不计入称帝所需经济城。', 'Secured connected frontier forts support recovery and forward construction. They produce no food or silver and are not throne economic cities.'],
  cityCapitalUse: ['同时控制此王都与 3 座粮草 / 银两经济城，连续坚守 {crown} 秒称帝。', 'Control this capital and 3 food / silver economic cities continuously for {crown}s to claim the throne.'],
  crownNone: ['称帝条件：王都 + 3 座经济外城 · 坚守 {n} 秒', 'To claim the throne: capital + 3 economic cities · Hold for {n}s'],
  crownHolder: ['{name} 控制王都 · 称帝还需 {n} 秒', '{name} holds the capital · {n}s until victory'],
  victoryHint: ['摧毁所有对手的主城；或同时控制王都与至少 3 座经济外城，连续坚守 120 秒。', 'Destroy every enemy base; or control the capital and at least 3 economic outer cities continuously for 120 seconds.'],
  battleReport: ['战报', 'Battle report'],
  noEvents: ['战事尚未开始。', 'The campaign has not begun.'],
  gameOver: ['战局结束', 'Battle ended'],
  victory: ['天下归一', 'Victory'],
  defeat: ['此战失利', 'Defeat'],
  draw: ['平局', 'Draw'],
  mutualExit: ['各方势力均已退出此战。', 'No faction remains in the battle.'],
  winner: ['{name} 赢得此战', '{name} wins the battle'],
  crownWin: ['连续控制王都，登基称帝。', 'Held the capital and claimed the throne.'],
  eliminationWin: ['最后一方仍存续的势力。', 'The last surviving faction.'],
  scoreWin: ['40 分钟时限已到：王都 3 分，其他据点各 1 分；同分比较主城剩余生命比例，再同则平局。', 'The 40-minute limit was reached: the capital is worth 3 points and every other city 1. Ties compare remaining base-health ratio; a further tie is a draw.'],
  again: ['再练一局', 'Practice again'],
  backRoom: ['返回房间', 'Return to room'],
  portfolioLink: ['DC Web 作品集', 'DC Web portfolio'],
  backHome: ['返回首页', 'Return home'],
  returnHomeTitle: ['结束当前征战？', 'Leave the current campaign?'],
  returnHomeHint: ['返回首页会离开当前房间或结束本地练兵。', 'Returning home leaves the room or ends local practice.'],
  cancel: ['取消', 'Cancel'],
  confirmHome: ['返回首页', 'Return home'],
  help: ['如何征战', 'How to play'],
  helpIntro: ['发展城池、征募军队、攻占据点；让你的朝代成为最后的势力。', 'Build an economy, recruit an army, and capture cities to unite the realm.'],
  helpEconomy: ['开局已有农庄、工坊、兵营与 3 支部队。农庄产粮，工坊产银；可先扩充经济，再补兵、升级。民居每座增加 4 支编队容量，普通部队最多 24 支，名将另算 1 名。', 'You start with a farm, workshop, barracks, and 3 squads. Farms produce food and workshops silver. Expand income before recruiting and upgrading. Each housing adds capacity for 4 squads, up to 24 ordinary squads plus 1 separate hero.'],
  helpCombat: ['长枪守住骑兵冲锋，骑兵绕击射手与器械，远程部队需要掩护，攻城器械用来破城。', 'Spears stop cavalry charges. Cavalry flank ranged troops and siege engines. Protect ranged units, and use siege engines against fortifications.'],
  helpCity: ['守军与城防耗尽后，留兵 {capture} 秒占领，随后整顿 {settle} 秒。已整顿且连通补给网的城池才能产出资源、恢复友军和提供建设落点。占领即可计入称帝资格，整顿与连通不是称帝前提。', 'After defeating the garrison and city defenses, keep troops nearby for {capture}s to capture, then allow {settle}s for securing. Secured cities connected to supply provide income, recovery, and construction sites. Capture alone counts toward the throne; securing and connection are not throne requirements.'],
  helpEconomyCities: ['全图只有 {economic} 座经济城（{food} 粮、{silver} 银）。普通城镇只提供微量粮银，边塞据点只提供补给，它们都不计入称帝所需的 3 座经济城。', 'Only {economic} cities are economic centers ({food} food, {silver} silver). Ordinary towns provide small income and frontier forts provide supply; neither counts toward the 3 throne economic cities.'],
  helpVictory: ['摧毁所有敌方主城获胜；或占王都 + 至少 3 座经济城，连续坚守 {crown} 秒。敌军进入王都争夺区、王都被破，或经济城不足 3 座都会重置倒计时。', 'Win by destroying every enemy base, or hold the capital and at least 3 economic cities for {crown}s. Enemy troops contesting the capital, broken capital defenses, or losing the third economic city resets the countdown.'],
  helpUpgrade: ['二级主城解锁骑兵、阵营精锐、名将与科技；三级解锁器械所与攻城车。升级会消耗资源，提前保留补兵费用。', 'Tier 2 unlocks cavalry, faction elites, heroes, and technology. Tier 3 unlocks the arsenal and siege engines. Keep some resources for reinforcements when upgrading.'],
  helpAdvanced: ['补给与时限细则', 'Supply and time-limit details'],
  controlsTitle: ['地图与军令操作', 'Map controls and orders'],
  helpSupply: ['补给网从主城附近的首座经济城向已控、已整顿的相邻城延伸。航线两端都是己方已整顿港口时也能传递补给；中立或敌方港口会截断补给。', 'Supply spreads from the economic city nearest your base through held, secured neighboring cities. Routes between two held secured ports also carry supply; neutral or enemy ports break that connection.'],
  helpPorts: ['先占本陆地上的港口，再选部队、右键海岛城市，自动沿港口航线运输；登陆后继续原命令。出航不必等港口整顿，运输途中暂不能改令、攻击或施放技能。港口可设在普通城镇中。', 'Capture a port on your troops’ landmass, select troops, then right-click an island city for automatic shipping. After landing they continue their orders. Departure does not require securing; troops cannot change orders, attack, or use skills at sea. Ports can also be ordinary towns.'],
  helpHero: ['武将改变局部战术，技能有冷却；武将仍需军队保护。', 'Heroes support local tactics with cooldown-based skills and still need protection.'],
  helpControls: ['左键拖动地图，单击选择；Shift 拖动框选，或用地图按钮切换到“框选部队”。中键 / 按住空格拖动也可平移，方向键移动视角。右键移动或攻击，双击城池 / 滚轮缩放；手机单指拖动、双指缩放。Home 返回主城，H 驻守并原地还击，Q 技能，Esc 取消。征战页可用键盘搜索城池。', 'Drag to pan and click to select. Shift-drag selects squads, or switch the map button to selection mode. Middle-drag / Space-drag also pans; arrow keys move the view. Right-click to move or attack, double-click cities / scroll to zoom. On mobile, drag with one finger and pinch with two. Home centers your base, H holds and returns fire without pursuit, Q uses a skill, and Esc cancels. Campaign search supports the keyboard.'],
  close: ['关闭', 'Close'],
  light: ['浅色主题', 'Light theme'],
  dark: ['深色主题', 'Dark theme'],
  settings: ['设置', 'Settings'],
  settingsIntro: ['选项即时生效，调整你的界面与地图操作体验。', 'Changes apply immediately to your interface and map controls.'],
  settingsAppearance: ['外观', 'Appearance'],
  settingsLightHint: ['明亮纸色，清晰浏览', 'Bright parchment for clear reading'],
  settingsDarkHint: ['深色背景，柔和观战', 'A darker, softer view'],
  settingsMapMode: ['默认地图操作', 'Default map controls'],
  settingsPan: ['拖动地图', 'Pan the map'],
  settingsPanHint: ['拖动浏览，单击查看', 'Drag to explore; click to inspect'],
  settingsSelect: ['框选部队', 'Select troops'],
  settingsSelectHint: ['拖动框选，中键 / 空格平移', 'Drag to select; middle-drag / Space-drag pans'],
  settingsWheel: ['滚轮缩放速度', 'Scroll zoom speed'],
  wheelComfortable: ['舒缓', 'Gentle'],
  wheelNormal: ['标准', 'Normal'],
  wheelFast: ['灵敏', 'Fast'],
  settingsReducedMotion: ['减少动画', 'Reduce motion'],
  settingsMotionHint: ['减少界面过渡与地图动画；对局继续实时进行。', 'Reduces interface transitions and map effects. Battles continue in real time.'],
  settingsMotionSystem: ['系统已开启减少动画，此处始终遵循系统设置。', 'Your system requests reduced motion. This preference is always respected.'],
  settingsAdvanced: ['联机高级设置', 'Advanced multiplayer settings'],
  settingsAdvancedHint: ['练兵无需配置。服务地址仅用于创建或加入联机房间。', 'Practice needs no configuration. The service address is only for creating or joining online rooms.'],
  settingsNextRoom: ['修改地址用于下一次开房或加入；当前房间与连接保持原样。', 'Address changes apply to the next room you create or join. Your current room and connection continue.'],
  settingsDone: ['完成', 'Done'],
  language: ['Switch to English', '切换为中文'],
  mapZoomIn: ['放大地图', 'Zoom in'],
  mapZoomOut: ['缩小地图', 'Zoom out'],
  mapCenter: ['返回主城', 'Center on base'],
  backendBusy: ['正在处理，请稍候…', 'Working, please wait…'],
  deploymentNotice: ['联机对局由服务端判定；练兵仅保存在本次浏览器会话中。', 'Online battles are server-authoritative. Practice lasts for this browser session.'],
  base: ['主城', 'Base'],
  general: ['武将', 'Hero'],
  technology: ['科技', 'Technology'],
  weapons: ['武器', 'Weapons'],
  armor: ['护甲', 'Armor'],
  logistics: ['后勤', 'Logistics'],
  dead: ['已出局', 'Eliminated'],
  spectator: ['已出局 · 可继续观战', 'Eliminated · Spectating'],
  reconnectDisabled: ['连接恢复后可继续下令。', 'Commands resume when the connection is restored.'],
  selectArmy: ['选中我方部队后可下达驻守或武将技能命令。', 'Select your army to hold position or use a hero skill.'],
  roomFull: ['房间已满或暂时无法加入。', 'The room is full or unavailable.'],
  pending: ['等待确认', 'Waiting for confirmation'],
  queueItem: ['{name} · {n} 秒', '{name} · {n}s'],
  matchmaking: ['大厅', 'Lobby'],
  factionLocked: ['对局中无法更换阵营。', 'You cannot change factions during a battle.'],
  errorUnavailable: ['操作未完成，请检查当前条件后重试。', 'The action could not complete. Check its requirements and try again.'],
  unlockedAt: ['{n} 级解锁', 'Unlocks at tier {n}'],
  builtAt: ['由{building}征募', 'Recruited at {building}'],
  buildingLimitInfo: ['最多 {n} 座', 'Up to {n} buildings'],
  farmEffect: ['每秒粮草 +{n}，持续供应征兵。', '+{n} food per second for a steady recruitment supply.'],
  workshopEffect: ['每秒银两 +{n}，支付建设、升级与科技。', '+{n} silver per second for buildings, upgrades, and research.'],
  barracksEffect: ['征募枪兵、弓兵；二级后可征募阵营精锐。', 'Recruits spearmen and archers, plus faction elites at tier 2.'],
  stableEffect: ['征募骑兵，适合侦察、追击与绕后。', 'Recruits cavalry for scouting, pursuit, and flanking.'],
  arsenalEffect: ['征募攻城车，加快摧毁城防和建筑。', 'Recruits siege engines to break city defenses and buildings.'],
  housingEffect: ['普通编队容量 +{n}，最高 {max}；名将另算 1 名。', '+{n} ordinary squad capacity, up to {max}; 1 hero is counted separately.'],
  towerEffect: ['自动射击附近敌军，守住基地或前线。', 'Automatically fires on nearby enemies to defend your base or front line.'],
  campEffect: ['元专属：可迁营、补给与征募普通兵种 / 精锐；不能越海迁移。', 'Yuan only: relocates, supplies troops, and recruits ordinary / elite units; cannot relocate across the sea.'],
  baseEffect: ['升级解锁兵种与科技；二级可在此征募 1 名名将。主城被毁即出局。', 'Upgrades unlock troops and technology; tier 2 recruits 1 hero here. Losing the citadel eliminates you.'],
  spearEffect: ['近战克制骑兵，保护身后的弓兵和器械。', 'Counters cavalry in melee and screens archers and siege engines.'],
  archerEffect: ['远程克制枪兵，怕骑兵贴近；放在枪兵后方。', 'Counters spearmen at range but is vulnerable to cavalry; deploy behind spears.'],
  cavalryEffect: ['移动快、克制射手，适合绕后；避开枪兵正面。', 'Fast and effective against archers; flank around enemy spearmen.'],
  siegeEffect: ['对城防与建筑伤害高，打部队弱、移动慢；需掩护。', 'High damage to city defenses and buildings, weak against troops and slow; needs protection.'],
  heroEffect: ['技能：{skill}。最多 1 名，不占普通编队容量。', 'Skill: {skill}. Limited to 1 hero, outside ordinary squad capacity.'],
  heroRecovery: ['倒下后恢复 {n} 秒，才可重新征募。', 'After defeat, wait {n}s before recruiting the hero again.'],
  weaponsEffect: ['我方部队造成的伤害 +15%。', 'Your troops deal 15% more damage.'],
  armorEffect: ['我方部队受到的伤害 −15%。', 'Your troops take 15% less damage.'],
  logisticsEffect: ['移动速度 +10%；补给区脱战恢复从每秒 3 提至 5 点。', 'Movement speed +10%; out-of-combat supply recovery rises from 3 to 5 HP per second.'],
  upgradeTwoEffect: ['解锁马厩、骑兵、阵营精锐、名将与全部科技。', 'Unlocks stables, cavalry, faction elites, heroes, and all technologies.'],
  upgradeThreeEffect: ['解锁器械所与攻城车，提升破城能力。', 'Unlocks the arsenal and siege engines for stronger assaults.'],
  beginnerGuide: ['新手指引', 'Beginner guide'],
  nextStep: ['下一步建议', 'Suggested next step'],
  hideGuide: ['收起新手指引', 'Hide beginner guide'],
  guideOpenTab: ['查看{tab}', 'Open {tab}'],
  guideViewCity: ['查看建议目标', 'Inspect suggested target'],
  openingRoute: ['开局已有农庄、工坊、兵营与 3 支部队。扩经济 → 补兵 → 升级 → 攻经济城 / 港口 → 争夺王都。', 'Start with a farm, workshop, barracks, and 3 squads. Expand income → recruit → upgrade → take economic cities / ports → contest the capital.'],
  guideFarmTitle: ['先补一座农庄', 'Add a farm first'],
  guideFarmWhy: ['粮草持续产出，征兵才不会很快断粮；已有建筑可以继续保留。', 'Steady food income sustains recruitment. Your starting farm already contributes.'],
  guideWorkshopTitle: ['再补一座工坊', 'Add a workshop next'],
  guideWorkshopWhy: ['建设、升级和科技都需要银两，先提高收入再扩军。', 'Buildings, upgrades, and research all need silver. Increase income before growing the army.'],
  guideBarracksTitle: ['建兵营，恢复征兵能力', 'Build barracks to recruit again'],
  guideBarracksWhy: ['枪兵与弓兵从兵营出征，步弓配合比单一兵种更稳。', 'Barracks produce spearmen and archers; their combined formation is more reliable than one unit type.'],
  guideRecruitTitle: ['补充枪兵与弓兵', 'Recruit spearmen and archers'],
  guideRecruitWhy: ['先形成约 5 支编队：枪兵顶前排，弓兵在后输出，再外出攻城。', 'Build toward about 5 squads: spears in front and archers behind, then move out to capture cities.'],
  guideHousingTitle: ['先建民居，再继续征兵', 'Build housing before recruiting more'],
  guideHousingWhy: ['征募中的部队也占容量；一座民居增加 4 支普通编队。', 'Recruiting squads reserve capacity too. Each housing adds room for 4 ordinary squads.'],
  guideTierTwoTitle: ['升级到二级主城', 'Upgrade to a tier 2 citadel'],
  guideTierTwoWhy: ['解锁骑兵、阵营精锐、名将与科技，开始发挥朝代特色。', 'Unlock cavalry, faction elites, heroes, and technology to use your dynasty’s strengths.'],
  guideCaptureTitle: ['先夺取粮草或银两经济城', 'Take a food or silver economic city'],
  guideCaptureWhy: ['全图只有 {n} 座经济城，夺下其中 3 座才有称帝资格。击破城防后留兵 {capture} 秒占领。出海扩张需先占本陆地港口。', 'Only {n} cities are economic centers, and 3 are needed for the throne. Break defenses and hold troops there for {capture}s. Capture a port before expanding overseas.'],
  guidePortTitle: ['这座城在另一块陆地：先占港口', 'This city is overseas: capture a port first'],
  guidePortWhy: ['占本陆地港口后，再选部队右键目标，军队会自动航运并登陆。', 'After capturing a port on your troops’ landmass, select troops and right-click the target for automatic shipping and landing.'],
  guideTierThreeTitle: ['升级三级，准备攻城器械', 'Reach tier 3 for siege engines'],
  guideTierThreeWhy: ['王都城防较强，三级解锁器械所与攻城车，可减少正面破城消耗。', 'The capital has strong defenses. Tier 3 unlocks siege engines to reduce the cost of a frontal assault.'],
  guideArsenalTitle: ['建设器械所', 'Build an arsenal'],
  guideArsenalWhy: ['攻城车在器械所征募，擅长打城防；记得配枪兵保护。', 'The arsenal recruits siege engines that specialize in fortifications; protect them with spearmen.'],
  guideSiegeTitle: ['征募一支攻城车', 'Recruit a siege engine'],
  guideSiegeWhy: ['用器械攻城、普通部队清守军并占领，避免让器械独自作战。', 'Use siege engines against defenses and ordinary troops against the garrison and to capture. Keep the siege engines protected.'],
  guideCapitalTitle: ['经济城已足，争夺洛阳王都', 'Your economic cities qualify: contest Luoyang'],
  guideCapitalWhy: ['占王都并保住至少 3 座经济城，连续 {crown} 秒即可称帝；也可直接摧毁敌方主城。', 'Capture the capital and keep at least 3 economic cities for {crown}s to claim the throne, or destroy the enemy bases.'],
  guideDefendTitle: ['保护王都与 3 座经济城', 'Defend the capital and 3 economic cities'],
  guideDefendWhy: ['清除王都附近敌军、保持城防与经济城归属，让称帝倒计时持续到 {crown} 秒。', 'Clear enemy troops from the capital, keep its defenses intact, and hold the economic cities for the full {crown}s countdown.'],
  guideInterruptTitle: ['优先打断对手称帝', 'Interrupt the opponent’s throne countdown'],
  guideInterruptWhy: ['夺回王都、破坏王都城防，或把对手的经济城减到不足 3 座，可重置其倒计时。', 'Retake the capital, break its defenses, or reduce the opponent to fewer than 3 economic cities to reset the countdown.'],
};
const dictionary = Object.fromEntries(['zh', 'en'].map((language, index) => [language, Object.fromEntries(Object.entries(words).map(([key, pair]) => [key, pair[index]]))]));
const query = new URLSearchParams(location.search);
const readStore = (key, fallback = '') => { try { return localStorage.getItem(PREFIX + key) ?? fallback; } catch { return fallback; } };
const writeStore = (key, value) => { try { if (value === null) localStorage.removeItem(PREFIX + key); else localStorage.setItem(PREFIX + key, String(value)); } catch { /* A private browser session can still play. */ } };
const WHEEL_SPEEDS = Object.freeze({ comfortable: 0.75, normal: 1, fast: 1.35 });
function normalizeUIPreferences(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const field = key => Object.hasOwn(source, key) ? source[key] : undefined;
  return {
    mode: ['pan', 'select'].includes(field('mode')) ? field('mode') : 'pan',
    wheel: typeof field('wheel') === 'string' && Object.hasOwn(WHEEL_SPEEDS, field('wheel')) ? field('wheel') : 'normal',
    reducedMotion: field('reducedMotion') === true,
  };
}
function loadUIPreferences() {
  try { return normalizeUIPreferences(JSON.parse(readStore('ui-preferences', 'null'))); }
  catch { return normalizeUIPreferences(null); }
}
const reducedMotionMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let lang = ['zh', 'en'].includes(query.get('lang')) ? query.get('lang') : readStore('language', 'zh');
if (!['zh', 'en'].includes(lang)) lang = 'zh';
let theme = readStore('theme', window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
if (!['light', 'dark'].includes(theme)) theme = 'dark';
const t = (key, values = {}) => (dictionary[lang][key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ''));
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const items = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
const normalizeCityName = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').trim().toLocaleLowerCase('en');
const CITY_META = new Map(items(WORLD.cities).map(city => [city.id, city]));
const REGION_META = new Map(items(WORLD.regions).map(region => [region.id, region]));
const CITY_CATALOG = items(WORLD.cities).map((city, index) => ({ ...city, catalogIndex: index, searchNames: [...new Set([city.name, city.nameEn, city.nameZhSource, city.sourceName].filter(Boolean).map(normalizeCityName))] }));
const CITIES_BY_REGION = new Map(items(WORLD.regions).map(region => [region.id, CITY_CATALOG.filter(city => city.regionId === region.id)]));
const CITY_RULES = {
  capture: Data.RULES?.captureDuration || 20, settle: Data.RULES?.settleDuration || 45, crown: Data.RULES?.crownDuration || 120,
  economic: CITY_CATALOG.filter(city => ['food', 'silver'].includes(city.kind)).length,
  food: CITY_CATALOG.filter(city => city.kind === 'food').length,
  silver: CITY_CATALOG.filter(city => city.kind === 'silver').length,
};
const decimal = value => new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en', { maximumFractionDigits: 2 }).format(Number(value) || 0);
const number = value => Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 0;
const timeLabel = value => `${Math.floor(number(value) / 60).toString().padStart(2, '0')}:${(number(value) % 60).toString().padStart(2, '0')}`;
const label = meta => meta ? (lang === 'en' ? meta.nameEn || meta.name : meta.name) || '' : '';
const description = meta => meta ? (lang === 'en' ? meta.descriptionEn || '' : meta.description || '') : '';
const errorTranslations = {
  '对局已经结束。': ['对局已经结束。', 'The battle has ended.'],
  '玩家不在当前对局中。': ['玩家不在当前对局中。', 'This player is not active in this battle.'],
  '指令格式无效。': ['指令格式无效。', 'Invalid command format.'],
  '建筑类型无效。': ['建筑类型无效。', 'Invalid building type.'],
  '该建筑仅限对应阵营。': ['该建筑仅限对应阵营。', 'This building is faction-specific.'],
  '需要升级主城。': ['需要升级主城。', 'Upgrade your main citadel first.'],
  '已达到建筑数量上限。': ['已达到建筑数量上限。', 'Building limit reached.'],
  '粮草或银两不足。': ['粮草或银两不足。', 'Not enough food or silver.'],
  '这里不能建设，请选择主城或已整顿城池附近的空地。': ['这里不能建设，请选择主城或已整顿城池附近的空地。', 'Build on open ground near your base or a secured, connected city.'],
  '兵种类型无效。': ['兵种类型无效。', 'Invalid unit type.'],
  '名将正在恢复，或已经在场。': ['名将正在恢复，或已经在场。', 'Your hero is recovering or is already deployed.'],
  '军队容量已满，请建设民居。': ['军队容量已满，请建设民居。', 'Army capacity reached. Build housing first.'],
  '征兵建筑不可用。': ['征兵建筑不可用。', 'The selected recruitment building is unavailable.'],
  '请先建设对应征兵建筑。': ['请先建设对应征兵建筑。', 'Build the required recruitment building first.'],
  '征兵队列已满。': ['征兵队列已满。', 'Recruitment queue is full.'],
  '主城已达到最高等级。': ['主城已达到最高等级。', 'Your main citadel is at maximum tier.'],
  '主城正在升级。': ['主城正在升级。', 'Your main citadel is upgrading.'],
  '科技类型无效。': ['科技类型无效。', 'Invalid technology.'],
  '需要二级主城。': ['需要二级主城。', 'Requires a tier 2 main citadel.'],
  '该科技已研究或正在研究。': ['该科技已研究或正在研究。', 'This technology is completed or being researched.'],
  '请等待当前研究完成。': ['请等待当前研究完成。', 'Wait for the current research to finish.'],
  '请选择自己的军队。': ['请选择自己的军队。', 'Select your own army.'],
  '不能指挥其他势力或不存在的军队。': ['不能指挥其他势力或不存在的军队。', 'You can command only your living units.'],
  '目标位置不可通行。': ['目标位置不可通行。', 'The destination is impassable.'],
  '攻击目标无效。': ['攻击目标无效。', 'Invalid attack target.'],
  '目标不在当前视野内。': ['目标不在当前视野内。', 'The target is outside your current vision.'],
  '请选中自己的名将。': ['请选中自己的名将。', 'Select your own hero.'],
  '名将技能正在冷却。': ['名将技能正在冷却。', 'The hero skill is on cooldown.'],
  '只能迁移自己的元军移动军营。': ['只能迁移自己的元军移动军营。', 'Only your Yuan mobile camp can relocate.'],
  '迁移地点必须是视野中的可通行空地。': ['迁移地点必须是视野中的可通行空地。', 'Relocate to visible, accessible open ground.'],
  '请等待军营征兵完成。': ['请等待军营征兵完成。', 'Wait for the camp recruitment queue to finish.'],
  '协同军令需要附近至少两种兵种。': ['协同军令需要附近至少两种兵种。', 'Combined Command needs at least two nearby unit categories.'],
  '列阵需要附近同时有枪兵和火铳兵。': ['列阵需要附近同时有枪兵和火铳兵。', 'Disciplined Formation requires nearby spearmen and handgunners.'],
  '筑垒地点必须是名将附近的空地。': ['筑垒地点必须是名将附近的空地。', 'Build the field fortification on open ground near your hero.'],
  '名将附近没有筑垒空地。': ['名将附近没有筑垒空地。', 'There is no open ground near your hero for a fortification.'],
  '需要先占领本陆地上的港口，才能自动航运。': ['需要先占领本陆地上的港口，才能自动航运。', 'Capture a port on your current landmass before using automatic sea transport.'],
  '没有通往目标陆地的港口航线。': ['没有通往目标陆地的港口航线。', 'There is no port route to the destination landmass.'],
  '运输中的军队不能攻击或施展技能。': ['运输中的军队不能攻击或施展技能。', 'Troops at sea cannot attack or use skills.'],
  '运输中的军队请等待登陆后再下令。': ['运输中的军队请等待登陆后再下令。', 'Wait until transported troops land before issuing new orders.'],
  '军营不能越海迁移。': ['军营不能越海迁移。', 'Mobile camps cannot relocate across the sea.'],
  '未知指令。': ['未知指令。', 'Unknown command.'],
  'Invalid player details': ['玩家信息无效。', 'Invalid player details.'],
  'Name must contain 1–24 characters': ['名号须为 1–24 个字符。', 'Name must contain 1–24 characters.'],
  'Unknown faction': ['阵营无效。', 'Unknown faction.'],
  'Room expired': ['房间已过期，请重新创建。', 'Room expired. Create a new room.'],
  'Game already started': ['对局已经开始。', 'The battle has already started.'],
  'Room is full': ['房间已满。', 'The room is full.'],
  'Invalid or expired player token': ['房间凭据已失效，请重新加入房间。', 'Room credentials expired. Join the room again.'],
  'Player unavailable': ['玩家无法加入当前房间。', 'This player is unavailable.'],
  'Cannot change readiness now': ['当前无法修改准备状态。', 'Readiness cannot be changed now.'],
  'Cannot select this faction': ['当前无法选择该阵营。', 'This faction cannot be selected now.'],
  'Only the host can start': ['只有房主可以开战。', 'Only the host can start the battle.'],
  'At least two connected players must all be ready': ['需要至少两名在线玩家，并且所有在线玩家都已准备。', 'At least two connected players must all be ready.'],
  'Command already processed': ['此命令已经处理。', 'This command has already been processed.'],
  'Game is not running': ['当前没有进行中的对局。', 'There is no active battle.'],
};
function errorText(message) {
  const value = String(message || '');
  if (errorTranslations[value]) return errorTranslations[value][lang === 'zh' ? 0 : 1];
  return lang === 'en' && /[\u3400-\u9fff]/.test(value) ? t('errorUnavailable') : value || t('errorUnavailable');
}
const factionKeys = Object.keys(FACTIONS);
const byId = id => document.getElementById(id);
const nodes = Object.fromEntries(['app', 'battlefield', 'resource-food', 'resource-silver', 'resource-army', 'match-time', 'connection-state', 'player-badge', 'victory-banner', 'inspector', 'action-tabs', 'action-content', 'selection-panel', 'event-list', 'room-panel', 'dialog-layer', 'toast', 'language-toggle', 'theme-toggle', 'help-toggle', 'home-button', 'zoom-in', 'zoom-out', 'center-view', 'map-pan-toggle', 'game-cover', 'cover-image', 'cover-begin', 'cover-view-map', 'cover-return', 'settings-toggle'].map(id => [id, byId(id)]));
const state = {
  mode: 'preview', tab: 'lobby', snapshot: null, game: null, playerId: null,
  coverHidden: false, preferences: loadUIPreferences(), dialogReturnFocus: null,
  selected: [], groups: new Map(), placement: null, localBots: [],
  name: readStore('name', ''), faction: readStore('faction', 'qin'), botCount: 3,
  joinCode: query.get('room') || '',
  backend: readStore('backendURL', ''), socket: null, lobby: null, room: null,
  connected: false, busy: false, intentionalClose: false, reconnectAt: 0,
  reconnectTimer: 0, reconnectAttempt: 0, reconnectStopped: false,
  seq: 0, pending: new Map(), lastRender: 0, endedKey: '', lastFrame: 0,
  awaitingBattle: false, lastPing: 0,
  citySearch: '', citySearchRegion: 'all', citySearchExact: false, citySearchPorts: false,
  guideVisible: readStore('beginnerGuide', 'true') !== 'false', sourceExpanded: new Set(),
  resetNotice: '', mapMismatch: false, mapMismatchKey: '',
  campaignCache: { snapshot: null, cities: new Map(), ownerKey: '' },
  territoryCache: { key: '', html: '' }, searchMatchCache: { key: '', matches: [] }, searchHtmlCache: { key: '', html: '' },
  toastTimer: 0, renderCache: new Map(), dialog: null,
};
if (!FACTIONS[state.faction]) state.faction = factionKeys[0];
if (query.get('server')) {
  try { const url = new URL(query.get('server')); if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) state.backend = url.origin + url.pathname.replace(/\/$/, ''); } catch { /* Invalid invite parameters are ignored. */ }
}
let savedRoom = null;
try { savedRoom = JSON.parse(readStore('roomtoken', 'null')); } catch { /* Ignore incomplete previous storage. */ }

function serverBase() {
  if (state.backend) return state.backend.replace(/\/+$/, '');
  if (location.protocol === 'file:' || /(^|\.)github\.io$/i.test(location.hostname)) return null;
  return location.origin;
}

function setHTML(node, html) {
  if (!node || state.renderCache.get(node) === html) return;
  const focused = node.contains(document.activeElement) ? document.activeElement : null;
  const focusKey = focused?.getAttribute('data-focus-key') || focused?.id;
  const selection = focused instanceof HTMLInputElement ? [focused.selectionStart, focused.selectionEnd] : null;
  node.innerHTML = html;
  state.renderCache.set(node, html);
  if (focusKey) {
    const replacement = [...node.querySelectorAll('[data-focus-key], [id]')].find(element => element.getAttribute('data-focus-key') === focusKey || element.id === focusKey);
    if (replacement && !replacement.disabled) {
      replacement.focus({ preventScroll: true });
      if (selection && replacement instanceof HTMLInputElement) { try { replacement.setSelectionRange(...selection); } catch { /* Number inputs have no text range. */ } }
    }
  }
}

function toast(text) {
  if (!nodes.toast) return;
  nodes.toast.textContent = text;
  nodes.toast.classList.add('visible');
  nodes.toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { nodes.toast.classList.remove('visible'); nodes.toast.hidden = true; }, 4200);
}

function setLanguage(next) {
  lang = next;
  writeStore('language', lang);
  const url = new URL(location.href); url.searchParams.set('lang', lang); history.replaceState(null, '', url);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = 'DC Web';
  document.querySelectorAll('[data-i18n]').forEach(node => { if (dictionary[lang][node.dataset.i18n]) node.textContent = t(node.dataset.i18n, { n: ['territorySituation', 'territorySummaryTitle'].includes(node.dataset.i18n) ? REGION_META.size : CITY_CATALOG.length }); });
  for (const [selector, key] of [['.command-bar', 'matchStatus'], ['.battle-column', 'battlefieldArea'], ['#battlefield', 'canvasLabel'], ['.strategy-panel', 'strategyPanel'], ['#action-tabs', 'militaryActions'], ['.dispatch-section', 'battleReport']]) document.querySelector(selector)?.setAttribute('aria-label', t(key));
  if (nodes['language-toggle']) { nodes['language-toggle'].textContent = lang === 'zh' ? 'EN' : '中文'; nodes['language-toggle'].setAttribute('aria-label', t('language')); }
  if (nodes['help-toggle']) nodes['help-toggle'].setAttribute('aria-label', t('help'));
  if (nodes['settings-toggle']) nodes['settings-toggle'].setAttribute('aria-label', t('settings'));
  if (nodes['cover-image']) nodes['cover-image'].alt = t('coverArtAlt');
  if (nodes['home-button']) nodes['home-button'].setAttribute('aria-label', t('backHome'));
  for (const [id, key] of [['zoom-in', 'mapZoomIn'], ['zoom-out', 'mapZoomOut'], ['center-view', 'mapCenter']]) nodes[id]?.setAttribute('aria-label', t(key));
  nodes['action-tabs']?.querySelectorAll('[data-tab]').forEach(node => { node.textContent = t(node.dataset.tab); });
  setTheme(theme);
  state.renderCache.clear();
  render();
  if (state.dialog) renderDialog();
}

function setTheme(next) {
  if (!['light', 'dark'].includes(next)) return;
  theme = next;
  writeStore('theme', theme);
  document.documentElement.dataset.theme = theme;
  nodes.app?.setAttribute('data-theme', theme);
  if (nodes['theme-toggle']) {
    nodes['theme-toggle'].setAttribute('aria-label', t(theme === 'dark' ? 'light' : 'dark'));
    nodes['theme-toggle'].textContent = theme === 'dark' ? '☀' : '☾';
  }
  syncSettingsFields();
}
function storeUIPreferences(patch) {
  state.preferences = normalizeUIPreferences({ ...state.preferences, ...patch });
  writeStore('ui-preferences', JSON.stringify(state.preferences));
}
function applyReducedMotion() {
  document.documentElement.dataset.reducedMotion = String(state.preferences.reducedMotion);
  battlefield.setReducedMotionPreference?.(state.preferences.reducedMotion);
  syncSettingsFields();
}
function applyUIPreferences() {
  battlefield.setInteractionMode?.(state.preferences.mode);
  battlefield.setWheelSensitivity?.(WHEEL_SPEEDS[state.preferences.wheel]);
  applyReducedMotion();
}
function syncSettingsFields() {
  if (state.dialog?.type !== 'settings') return;
  nodes['dialog-layer']?.querySelectorAll('input[name="settings-theme"]').forEach(input => { input.checked = input.value === theme; input.closest('.settings-option')?.classList.toggle('selected', input.checked); });
  nodes['dialog-layer']?.querySelectorAll('input[name="settings-mode"]').forEach(input => { input.checked = input.value === state.preferences.mode; input.closest('.settings-option')?.classList.toggle('selected', input.checked); });
  const wheel = byId('settings-wheel');
  if (wheel) wheel.value = state.preferences.wheel;
  const motion = byId('settings-reduced-motion');
  if (motion) { motion.checked = Boolean(reducedMotionMedia?.matches || state.preferences.reducedMotion); motion.disabled = Boolean(reducedMotionMedia?.matches); }
  const note = byId('settings-motion-note');
  if (note) note.textContent = t(reducedMotionMedia?.matches ? 'settingsMotionSystem' : 'settingsMotionHint');
}
function renderCover() {
  const visible = Boolean(nodes['game-cover']) && state.mode === 'preview' && !state.coverHidden;
  const cover = nodes['game-cover'];
  const focusWasCovered = cover?.contains(document.activeElement);
  if (cover) { cover.hidden = !visible; cover.setAttribute('aria-hidden', String(!visible)); }
  if (nodes['cover-return']) nodes['cover-return'].hidden = !(state.mode === 'preview' && state.coverHidden);
  for (const id of ['battlefield', 'map-pan-toggle', 'zoom-in', 'zoom-out', 'center-view']) if (nodes[id]) nodes[id].inert = visible;
  document.querySelectorAll('.map-tools, .map-navigation').forEach(group => { group.inert = visible; });
  const skipLink = document.querySelector('.skip-link');
  if (skipLink) { skipLink.setAttribute('href', visible ? '#cover-begin' : '#battlefield'); skipLink.textContent = t(visible ? 'skipPrepare' : 'skip'); }
  document.querySelectorAll('[data-i18n="controlHint"]').forEach(node => { node.textContent = t(visible ? 'coverStartHint' : 'controlHint'); });
  if (!visible && focusWasCovered) nodes.battlefield?.focus({ preventScroll: true });
  const preparing = state.mode === 'preview' || state.mode === 'online' && state.lobby?.phase !== 'playing';
  const heading = document.querySelector('.panel-heading');
  const title = heading?.querySelector('h1');
  const eyebrow = heading?.querySelector('.eyebrow');
  if (title) title.textContent = t(preparing ? 'prepareBattle' : 'panelTitle');
  if (eyebrow) eyebrow.textContent = t(preparing ? 'prepareEyebrow' : 'commandCenter');
}

function ownPlayer() { return items(state.snapshot?.players).find(player => player.id === state.playerId); }
function entityById(id) {
  for (const [kind, collection] of [['unit', state.snapshot?.units], ['building', state.snapshot?.buildings], ['city', state.snapshot?.cities]]) {
    const entity = items(collection).find(item => item.id === id);
    if (entity) return { ...(kind === 'city' ? CITY_META.get(id) : {}), ...entity, entityKind: kind };
  }
  for (const player of items(state.snapshot?.players)) if (player.base?.id === id) return { ...player.base, owner: player.id, type: 'base', entityKind: 'building' };
  const region = items(WORLD.regions).find(item => item.id === id);
  if (region) {
    const city = items(state.snapshot?.cities).find(item => item.id === region.cityId) || items(state.snapshot?.cities).find(item => item.regionId === region.id && item.kind !== 'town');
    if (city) return { ...CITY_META.get(city.id), ...city, id: region.id, controllingCityId: city.id, name: region.name, nameEn: region.nameEn, entityKind: 'region', regionId: region.id };
  }
  return null;
}
function selectedEntities() { return state.selected.map(entityById).filter(Boolean); }
function ownSelectedUnits() { return selectedEntities().filter(entity => entity.entityKind === 'unit' && entity.owner === state.playerId); }
function factionOf(owner = state.playerId) { return FACTIONS[items(state.snapshot?.players).find(player => player.id === owner)?.faction || state.faction]; }
function entityName(entity) {
  if (['city', 'region'].includes(entity.entityKind)) return lang === 'en' ? entity.nameEn || entity.name : entity.name;
  if (entity.type === 'base') return t('base');
  if (entity.type === 'hero') return label(factionOf(entity.owner)?.hero) || t('general');
  if (entity.type === 'unique') return label(factionOf(entity.owner)?.unique) || label(UNITS.unique);
  return label((entity.entityKind === 'unit' ? UNITS : BUILDINGS)[entity.type]) || entity.type;
}
function canPlay() { return !state.mapMismatch && ['practice', 'online'].includes(state.mode) && state.snapshot?.status === 'playing' && ownPlayer()?.alive !== false && (state.mode === 'practice' || state.connected); }
function ownerName(owner) { return items(state.snapshot?.players).find(player => player.id === owner)?.name || t('neutral'); }
function regionName(entity) { return label(REGION_META.get(entity.regionId)); }
function costText(cost = {}) { return t('cost', { food: number(cost.food), silver: number(cost.silver) }); }
function buildingEffect(type) {
  const meta = BUILDINGS[type] || {};
  if (type === 'farm') return t('farmEffect', { n: decimal(meta.income?.food) });
  if (type === 'workshop') return t('workshopEffect', { n: decimal(meta.income?.silver) });
  if (type === 'housing') return t('housingEffect', { n: meta.capacity || 4, max: Data.RULES?.maxSquads || 24 });
  return t(`${type}Effect`);
}
function unitEffect(type, owner = state.playerId) {
  const faction = factionOf(owner);
  if (type === 'unique') return description(faction?.unique);
  if (type === 'hero') return t('heroEffect', { skill: lang === 'en' ? faction?.hero.skillNameEn : faction?.hero.skillName });
  return t(`${type}Effect`);
}
function techEffect(tech) { return t(`${tech}Effect`); }
function unlockText(meta, producer = null) {
  return [t('unlockedAt', { n: meta.level || 1 }), producer ? t('builtAt', { building: label(BUILDINGS[producer]) }) : meta.limit ? t('buildingLimitInfo', { n: meta.limit }) : ''].filter(Boolean).join(' · ');
}
function actionTime(meta, kind = '') {
  const modifier = kind === 'research' ? factionOf()?.modifiers.researchSpeed || 1 : kind === 'tower' ? factionOf()?.modifiers.fortificationSpeed || 1 : 1;
  return t('seconds', { n: Math.ceil((meta.duration || 0) / modifier) });
}
function cityEffect(city) {
  const kind = selectedCityMeta(city).kind;
  if (kind === 'food') return t('cityFoodUse', { n: CITY_RULES.food });
  if (kind === 'silver') return t('citySilverUse', { n: CITY_RULES.silver });
  if (kind === 'town') return t('cityTownUse', { income: decimal(Data.RULES?.townIncome ?? 0.08) });
  return t(kind === 'capital' ? 'cityCapitalUse' : 'cityFortUse', CITY_RULES);
}
function nextAdvice() {
  const player = ownPlayer();
  if (!player || player.alive === false || state.snapshot?.status !== 'playing') return null;
  const ownBuildings = items(state.snapshot.buildings).filter(building => building.owner === state.playerId && !building.temporary);
  const units = items(state.snapshot.units).filter(unit => unit.owner === state.playerId);
  const army = units.filter(unit => unit.type !== 'hero').length + items(player.queue).filter(item => item.type === 'train' && item.unit !== 'hero').length;
  const cities = items(state.snapshot.cities);
  const economies = cities.filter(city => city.owner === state.playerId && ['food', 'silver'].includes(city.kind));
  const capital = cities.find(city => city.kind === 'capital');
  const count = type => ownBuildings.filter(building => building.type === type).length;
  const suggestion = (key, tab, cityId = null) => ({ key, title: t(`guide${key}Title`), why: t(`guide${key}Why`, { ...CITY_RULES, n: CITY_RULES.economic }), tab, cityId });
  if (state.snapshot.crown?.playerId && state.snapshot.crown.playerId !== state.playerId) return suggestion('Interrupt', 'lobby', capital?.id);
  if (capital?.owner === state.playerId && economies.length >= (Data.RULES?.crownEconomyCities || 3)) return suggestion('Defend', 'lobby', capital.id);
  if (count('farm') < 2) return suggestion('Farm', 'build');
  if (count('workshop') < 2) return suggestion('Workshop', 'build');
  if (!count('barracks') && !count('camp')) return suggestion('Barracks', 'build');
  if (army >= player.capacity - 1 && player.capacity < (Data.RULES?.maxSquads || 24)) return suggestion('Housing', 'build');
  if (army < 5) return suggestion('Recruit', 'train');
  if (player.level < 2) return suggestion('TierTwo', 'tech');
  const selectedCity = selectedEntities().find(entity => ['city', 'region'].includes(entity.entityKind));
  const homeComponent = units.find(unit => !unit.transit)?.component;
  if (selectedCity?.owner !== state.playerId && selectedCity?.component != null && homeComponent != null && selectedCity.component !== homeComponent && !cities.some(city => city.owner === state.playerId && city.port && city.component === homeComponent)) {
    const port = cities.filter(city => city.port && city.component === homeComponent).sort((a, b) => Math.hypot(a.x - player.base.x, a.y - player.base.y) - Math.hypot(b.x - player.base.x, b.y - player.base.y))[0];
    return suggestion('Port', 'lobby', port?.id);
  }
  if (economies.length < (Data.RULES?.crownEconomyCities || 3)) {
    const target = cities.filter(city => ['food', 'silver'].includes(city.kind) && city.owner !== state.playerId).sort((a, b) => Math.hypot(a.x - player.base.x, a.y - player.base.y) - Math.hypot(b.x - player.base.x, b.y - player.base.y))[0];
    return suggestion('Capture', 'lobby', target?.id);
  }
  if (player.level < 3) return suggestion('TierThree', 'tech');
  if (!count('arsenal')) return suggestion('Arsenal', 'build');
  if (!units.some(unit => unit.type === 'siege') && !items(player.queue).some(item => item.unit === 'siege')) return suggestion('Siege', 'train');
  return suggestion('Capital', 'lobby', capital?.id);
}
function renderGuide() {
  const advice = nextAdvice();
  if (!advice) return '';
  if (!state.guideVisible) return button('guide-show', t('beginnerGuide'), { className: 'button secondary guide-reopen', data: { 'focus-key': 'guide-toggle' } });
  const action = advice.cityId ? button('inspect-city', t('guideViewCity'), { className: 'button secondary guide-action', data: { city: advice.cityId, zoom: 5 } }) : advice.tab !== state.tab ? button('guide-next', t('guideOpenTab', { tab: t(advice.tab) }), { className: 'button secondary guide-action', data: { tab: advice.tab } }) : '';
  return `<section class="onboarding-card" aria-label="${escape(t('beginnerGuide'))}"><div class="onboarding-heading"><span class="eyebrow">${escape(t('nextStep'))}</span><button type="button" class="guide-dismiss" data-action="guide-hide" data-focus-key="guide-toggle" aria-label="${escape(t('hideGuide'))}" title="${escape(t('hideGuide'))}">×</button></div><strong class="guide-title">${escape(advice.title)}</strong><p class="guide-why">${escape(advice.why)}</p>${action}</section>`;
}
function button(action, title, options = {}) {
  const attrs = Object.entries(options.data || {}).map(([key, value]) => `data-${key}="${escape(value)}"`).join(' ');
  return `<button type="button" class="${escape(options.className || 'button')}${options.disabled ? ' is-disabled' : ''}" data-action="${escape(action)}" ${attrs} ${options.disabled ? 'disabled' : ''} ${options.reason ? `title="${escape(options.reason)}"` : ''}>${escape(title)}</button>`;
}

const battlefield = new Battlefield(nodes.battlefield, {
  onSelect(ids, entity) {
    state.selected = [...new Set(ids?.length ? ids : entity?.id ? [entity.id] : [])].filter(id => entityById(id));
    renderSelection();
    if (state.tab === 'train') renderActions();
  },
  onOrder({ x, y, targetId }) {
    if (!canPlay()) return toast(t(state.mode === 'online' && !state.connected ? 'reconnectDisabled' : 'cannotCommand'));
    const units = ownSelectedUnits();
    if (units.some(unit => unit.transit)) return toast(t('transitOrdersWait'));
    const ids = units.map(unit => unit.id);
    if (!ids.length) return toast(t('onlyOwned'));
    sendCommand(targetId ? { type: 'attack', ids, targetId } : { type: 'move', ids, x, y });
  },
  onPoint({ x, y }) {
    const placement = state.placement;
    if (!placement || !canPlay()) return;
    if (placement.kind === 'build') sendCommand({ type: 'build', building: placement.type, x, y });
    if (placement.kind === 'skill') sendCommand({ type: 'skill', heroId: placement.heroId, x, y });
    if (placement.kind === 'pack') sendCommand({ type: 'pack', buildingId: placement.buildingId, x, y });
    cancelPlacement();
  },
  onStatus(text) { if (text) { if (state.placement && /cancel|取消/i.test(text)) cancelPlacement(); toast(text); } },
  onCancelPlacement: cancelPlacement,
  onInteractionModeChange(mode) { if (['pan', 'select'].includes(mode)) { storeUIPreferences({ mode }); syncSettingsFields(); } },
  getLanguage: () => lang,
});

function setSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.players)) return;
  state.snapshot = snapshot;
  state.playerId = snapshot.you || state.playerId;
  state.selected = state.selected.filter(id => entityById(id));
  battlefield.setPlayer(state.playerId);
  battlefield.setSnapshot(snapshot);
  battlefield.setSelection(state.selected);
  if (snapshot.status === 'ended' && state.mode !== 'preview') {
    const endedKey = `${state.mode}:${snapshot.time}:${snapshot.winner?.playerId || 'draw'}`;
    if (!state.endedKey) { state.endedKey = endedKey; cancelPlacement(); showDialog('ended'); }
  }
}

function createPreview() {
  const players = [
    { id: 'preview-qin', name: label(FACTIONS.qin), faction: 'qin', slot: 0 },
    { id: 'preview-han', name: label(FACTIONS.han), faction: 'han', slot: 1 },
    { id: 'preview-ming', name: label(FACTIONS.ming), faction: 'ming', slot: 2 },
    { id: 'preview-yuan', name: label(FACTIONS.yuan), faction: 'yuan', slot: 3 },
  ];
  state.game = createGame(players);
  state.playerId = players[0].id;
  state.localBots = [];
  const preview = snapshotFor(state.game, state.playerId);
  preview.units = state.game.units.map(unit => ({ ...unit }));
  preview.buildings = state.game.buildings.map(building => ({ ...building }));
  preview.cities = state.game.cities.map(city => ({ ...city, visible: true }));
  preview.visibility = [{ x: WORLD.width / 2, y: WORLD.height / 2, r: Math.hypot(WORLD.width, WORLD.height) }];
  setSnapshot(preview);
  battlefield.focus(WORLD.width / 2, WORLD.height / 2);
}

function startPractice() {
  captureSetupInputs();
  disconnectSocket(false);
  state.mode = 'practice'; state.lobby = null; state.room = null; state.tab = 'build';
  state.selected = []; state.groups.clear(); state.endedKey = ''; state.placement = null;
  closeDialog();
  applyUIPreferences();
  const opponents = factionKeys.filter(key => key !== state.faction);
  const players = [{ id: 'local-player', name: state.name.trim() || t('defaultName'), faction: state.faction, slot: 0 }];
  for (let i = 0; i < state.botCount; i++) {
    const faction = opponents[(i + Math.floor(Math.random() * opponents.length)) % opponents.length];
    players.push({ id: `bot-${i + 1}`, name: t('aiName', { faction: label(FACTIONS[faction]) }), faction, slot: i + 1 });
  }
  state.game = createGame(players);
  state.playerId = players[0].id;
  state.localBots = players.slice(1).map(player => player.id);
  setSnapshot(snapshotFor(state.game, state.playerId));
  const base = ownPlayer()?.base;
  if (base) battlefield.focus(base.x, base.y);
  render();
}

function captureSetupInputs() {
  const nameInput = byId('commander-name');
  if (nameInput) state.name = nameInput.value.slice(0, 24);
  const botInput = byId('bot-count');
  if (botInput) state.botCount = Math.max(1, Math.min(3, number(botInput.value)));
  writeStore('name', state.name); writeStore('faction', state.faction);
}

function sendCommand(command) {
  if (!canPlay()) return toast(t('cannotCommand'));
  if (state.mode === 'practice') {
    const result = applyCommand(state.game, state.playerId, command);
    if (!result?.ok) toast(t('commandFailed', { error: errorText(result?.error) || t('cannotCommand') }));
    setSnapshot(snapshotFor(state.game, state.playerId));
    render();
    return;
  }
  const seq = ++state.seq;
  if (state.room) { state.room.seq = seq; savedRoom = state.room; writeStore('roomtoken', JSON.stringify(savedRoom)); }
  state.pending.set(seq, performance.now());
  sendSocket({ type: 'command', seq, command });
}

function startPlacement(kind, details) {
  if (!canPlay()) return toast(t('cannotCommand'));
  state.placement = { kind, ...details };
  battlefield.setPlacement(kind === 'build' ? `build:${details.type}` : kind === 'pack' ? 'pack' : 'skill');
  toast(kind === 'build' ? t('placement', { name: label(BUILDINGS[details.type]) }) : t(kind === 'pack' ? 'packPlacement' : 'skillPlacement'));
  renderSelection();
}
function cancelPlacement() { state.placement = null; battlefield.setPlacement(null); renderSelection(); }

function render() {
  renderTop(); renderActions(); renderSelection(); renderEvents(); renderRoomPanel();
  nodes.app?.setAttribute('data-mode', state.mode);
  renderCover();
  nodes['action-tabs']?.querySelectorAll('[data-tab]').forEach(node => {
    const active = node.dataset.tab === state.tab;
    node.classList.toggle('active', active);
    node.setAttribute('aria-selected', String(active));
    node.tabIndex = active ? 0 : -1;
  });
}

function renderTop() {
  const player = ownPlayer();
  const active = state.mode !== 'preview';
  if (nodes['resource-food']) nodes['resource-food'].textContent = active && player?.food != null ? number(player.food).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US') : '—';
  if (nodes['resource-silver']) nodes['resource-silver'].textContent = active && player?.silver != null ? number(player.silver).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US') : '—';
  if (nodes['resource-army']) {
    const deployed = items(state.snapshot?.units).filter(unit => unit.owner === state.playerId && unit.type !== 'hero').length;
    const queued = items(player?.queue).filter(item => item.type === 'train' && item.unit !== 'hero').length;
    const heroes = items(state.snapshot?.units).filter(unit => unit.owner === state.playerId && unit.type === 'hero').length;
    nodes['resource-army'].textContent = active && player ? `${deployed}/${number(player.capacity)}${heroes ? ` +${heroes}` : ''}` : '—';
    nodes['resource-army'].title = t('armyBreakdown', { deployed, queued, capacity: number(player?.capacity), heroes });
  }
  if (nodes['match-time']) nodes['match-time'].textContent = active ? timeLabel(state.snapshot?.time) : '00:00';
  setHTML(nodes['player-badge'], `<span class="commander-seal">${escape(active && player ? label(FACTIONS[player.faction]).slice(0, 1) : lang === 'zh' ? '战' : 'DC')}</span><div><span class="eyebrow">${escape(active && player ? `${label(FACTIONS[player.faction])} · ${t('tier', { n: player.level })}` : t('battlefieldLabel'))}</span><strong>${escape(active && player ? player.name : t('previewTitle'))}</strong></div>`);
  let connection = t('preview');
  if (state.mode === 'practice') connection = t('offline');
  else if (state.mode === 'online') connection = state.mapMismatch ? t('mapMismatchShort') : state.connected ? t('connected') : state.reconnectAt && !state.reconnectStopped ? t('reconnecting', { n: Math.min(60, Math.floor((Date.now() - state.reconnectAt) / 1000)) }) : t('disconnected');
  else if (state.busy) connection = t('connecting');
  else if (!serverBase()) connection = t('noService');
  if (nodes['connection-state']) { const status = state.mapMismatch ? 'error' : state.mode === 'practice' || state.connected ? 'connected' : state.mode === 'online' ? 'reconnecting' : 'preview'; nodes['connection-state'].textContent = connection; nodes['connection-state'].dataset.status = status; nodes['connection-state'].className = `connection-badge ${status}`; }
  const crown = state.snapshot?.crown;
  let crownText = t('crownNone', { n: crown?.required || 120 });
  if (crown?.playerId) crownText = t('crownHolder', { name: ownerName(crown.playerId), n: Math.max(0, Math.ceil((crown.required || 120) - crown.progress)) });
  if (nodes['victory-banner']) {
    nodes['victory-banner'].hidden = state.mode === 'preview';
    nodes['victory-banner'].textContent = state.mode === 'preview' ? t('victoryHint') : ownPlayer()?.alive === false && state.snapshot?.status === 'playing' ? t('spectator') : crownText;
    nodes['victory-banner'].dataset.contested = crown?.playerId ? 'true' : 'false';
  }
}

function factionCards(locked = false) {
  return `<div class="faction-grid">${factionKeys.map(id => {
    const faction = FACTIONS[id];
    const selected = (state.lobby?.players.find(player => player.id === state.playerId)?.faction || state.faction) === id;
    return `<button type="button" class="faction-card${selected ? ' selected' : ''}" data-action="faction" data-faction="${escape(id)}" aria-pressed="${selected}" title="${escape(description(faction))}" ${locked ? 'disabled' : ''} style="--faction-color:${escape(faction.color || '#a87839')}"><strong class="faction-sigil">${escape(lang === 'zh' ? faction.name : faction.nameEn)}</strong><small>${escape(lang === 'zh' ? faction.nameEn : faction.name)}</small></button>`;
  }).join('')}</div>${factionSummary()}`;
}

function factionSummary() {
  const faction = FACTIONS[state.lobby?.players.find(player => player.id === state.playerId)?.faction || state.faction];
  const ruler = lang === 'en' ? faction.rulerEn : faction.ruler;
  const feature = lang === 'en' ? faction.featureEn : faction.feature;
  const skill = lang === 'en' ? faction.hero.skillNameEn : faction.hero.skillName;
  return `<div class="faction-description"><strong>${escape(description(faction))}</strong><p>${escape(t('ruler'))} ${escape(ruler)} · ${escape(label(faction.hero))} / ${escape(skill)}</p><p>${escape(t('elite'))} ${escape(label(faction.unique))} · ${escape(feature)}</p></div>`;
}

function campaignCities() {
  if (state.campaignCache.snapshot !== state.snapshot) {
    const cities = new Map(items(state.snapshot?.cities).map(city => [city.id, city]));
    state.campaignCache = { snapshot: state.snapshot, cities, ownerKey: [...cities.values()].map(city => `${city.id}:${city.owner || ''}`).join('|') };
  }
  return state.campaignCache;
}

function resourceLabel(city) {
  return t({ food: 'foodRegion', silver: 'silverRegion', capital: 'capitalRegion', fort: 'fortRegion', town: 'townRegion' }[city.kind] || 'city');
}

function cityRow(city, regionLabel = '', controlled = '') {
  const meta = CITY_META.get(city.id) || city;
  const player = items(state.snapshot?.players).find(item => item.id === city.owner);
  const owner = player?.name || t('neutral');
  const cityLabel = lang === 'en' ? meta.nameEn || meta.name : meta.name;
  const region = regionLabel || label(REGION_META.get(meta.regionId));
  const kind = `${resourceLabel(meta)}${meta.port ? ` · ${t('port')}` : ''}`;
  const selected = state.selected.includes(city.id) || Boolean(regionLabel && state.selected.includes(meta.regionId));
  return `<button type="button" class="territory-row${selected ? ' selected' : ''}" data-action="inspect-city" data-city="${escape(city.id)}" ${regionLabel ? '' : 'data-zoom="5"'} data-focus-key="city-${escape(city.id)}" aria-label="${escape(t('inspectCityLabel', { region: controlled ? `${region}, ${controlled}` : region, owner, kind, city: cityLabel }))}"><span class="territory-marker" style="background:${escape(FACTIONS[player?.faction]?.color || '#9b947c')}"></span><span class="territory-main"><strong>${escape(regionLabel || cityLabel)}</strong><small>${escape(controlled || region)}</small>${regionLabel ? `<small>${escape(t('controlCenter'))}: ${escape(cityLabel)}</small>` : ''}</span><span class="territory-status"><span>${escape(owner)}</span><small>${escape(kind)}</small></span></button>`;
}

function renderTerritoryList() {
  if (!ownPlayer() || state.snapshot?.status !== 'playing') return '';
  const { cities, ownerKey } = campaignCities();
  const playersKey = items(state.snapshot.players).map(player => `${player.id}:${player.name}:${player.faction}`).join('|');
  const key = `${lang}|${state.playerId}|${ownerKey}|${state.selected.join(',')}|${playersKey}`;
  if (state.territoryCache.key === key) return state.territoryCache.html;
  const rows = items(WORLD.regions).map(region => {
    const center = cities.get(region.cityId);
    if (!center) return '';
    const regionalCities = CITIES_BY_REGION.get(region.id) || [];
    const owned = regionalCities.filter(city => cities.get(city.id)?.owner === state.playerId).length;
    return cityRow(center, label(region), t('regionControlled', { owned, total: regionalCities.length }));
  }).join('');
  state.territoryCache = { key, html: rows };
  return rows;
}

function citySearchShell() {
  return `<section class="city-search-section"><h3>${escape(t('citySearch'))}</h3><p class="hint">${escape(t('cityCatalogCount', { n: CITY_CATALOG.length }))}</p><label class="field-label" for="city-search">${escape(t('citySearch'))}</label><input id="city-search" class="text-input" type="search" data-focus-key="city-search" maxlength="100" autocomplete="off" placeholder="${escape(t('citySearchPlaceholder'))}"><div class="city-search-options"><label class="field-label" for="city-search-region">${escape(t('regionFilter'))}</label><select id="city-search-region" class="text-input" data-focus-key="city-search-region"><option value="all">${escape(t('allRegions'))}</option>${items(WORLD.regions).map(region => `<option value="${escape(region.id)}">${escape(label(region))}</option>`).join('')}</select><div class="button-row city-search-toggles">${button('search-exact', t('exactSearch'), { className: 'button secondary', data: { 'focus-key': 'search-exact' } })}${button('search-ports', t('portsOnly'), { className: 'button secondary', data: { 'focus-key': 'search-ports' } })}</div></div><p id="city-search-status" class="hint" role="status" aria-live="polite" aria-atomic="true"></p><div id="city-search-results" class="territory-list city-search-results"></div></section><section class="territory-section"><h3>${escape(t('territorySituation', { n: REGION_META.size }))}</h3><p class="hint">${escape(t('territoryHint'))}</p><div id="territory-summary" class="territory-list"></div></section>`;
}

function citySearchMatches() {
  const queryText = normalizeCityName(state.citySearch);
  const key = `${queryText}|${state.citySearchRegion}|${state.citySearchExact}|${state.citySearchPorts}`;
  if (state.searchMatchCache.key === key) return state.searchMatchCache.matches;
  const active = Boolean(queryText || state.citySearchRegion !== 'all' || state.citySearchPorts);
  let matches = active ? CITY_CATALOG.filter(city =>
    (state.citySearchRegion === 'all' || city.regionId === state.citySearchRegion) &&
    (!state.citySearchPorts || city.port) &&
    (!queryText || city.searchNames.some(name => state.citySearchExact ? name === queryText : name.includes(queryText)))
  ) : [];
  const relevance = city => queryText ? city.searchNames.some(name => name === queryText) ? 0 : city.searchNames.some(name => name.startsWith(queryText)) ? 1 : 2 : 0;
  const priority = city => city.kind === 'capital' ? 0 : ['food', 'silver', 'fort'].includes(city.kind) ? 1 : city.port ? 2 : 3;
  matches = matches.sort((a, b) => relevance(a) - relevance(b) || priority(a) - priority(b) || a.catalogIndex - b.catalogIndex);
  state.searchMatchCache = { key, matches };
  return matches;
}

function updateCitySearch() {
  if (!byId('city-search')) return;
  const input = byId('city-search');
  if (input.value !== state.citySearch) input.value = state.citySearch;
  const regionFilter = byId('city-search-region');
  if (regionFilter && regionFilter.value !== state.citySearchRegion) regionFilter.value = state.citySearchRegion;
  for (const [action, enabled] of [['search-exact', state.citySearchExact], ['search-ports', state.citySearchPorts]]) {
    const toggle = nodes['action-content'].querySelector(`[data-action="${action}"]`);
    if (toggle && toggle.getAttribute('aria-pressed') !== String(enabled)) toggle.setAttribute('aria-pressed', String(enabled));
    if (toggle && toggle.classList.contains('selected') !== enabled) toggle.classList.toggle('selected', enabled);
  }
  const { cities } = campaignCities();
  const matches = citySearchMatches();
  const shown = matches.slice(0, 20);
  const active = Boolean(state.citySearch.trim() || state.citySearchRegion !== 'all' || state.citySearchPorts);
  const status = active ? t('citySearchResults', { matched: matches.length, shown: shown.length, total: CITY_CATALOG.length }) : t('citySearchStart', { n: CITY_CATALOG.length });
  const statusNode = byId('city-search-status');
  if (statusNode && statusNode.textContent !== status) statusNode.textContent = status;
  const key = `${lang}|${state.searchMatchCache.key}|${shown.map(city => `${city.id}:${cities.get(city.id)?.owner || ''}`).join('|')}|${state.selected.join(',')}|${items(state.snapshot?.players).map(player => `${player.id}:${player.name}:${player.faction}`).join('|')}`;
  if (state.searchHtmlCache.key !== key) {
    const rows = shown.map(meta => cityRow({ ...meta, ...cities.get(meta.id) })).join('');
    state.searchHtmlCache = { key, html: rows || (active ? `<p class="empty-state">${escape(t('citySearchEmpty'))}</p>` : '') };
  }
  setHTML(byId('city-search-results'), state.searchHtmlCache.html);
  setHTML(byId('territory-summary'), renderTerritoryList());
}

function renderActions() {
  if (!nodes['action-content']) return;
  if (state.mode === 'preview' || (state.mode === 'online' && state.lobby && state.lobby.phase !== 'playing' && state.tab === 'lobby')) return renderSetup();
  if (state.tab === 'lobby') {
    const player = ownPlayer();
    const searchFocus = document.activeElement?.id === 'city-search' ? [document.activeElement.selectionStart, document.activeElement.selectionEnd, document.activeElement.selectionDirection] : null;
    const search = player && state.snapshot?.status === 'playing' ? citySearchShell() : '';
    setHTML(nodes['action-content'], `<section class="panel-section">${renderGuide()}<div class="eyebrow">${escape(t('lobby'))}</div><h2>${escape(player ? label(FACTIONS[player.faction]) : t('preview'))}</h2><p class="muted">${escape(description(player ? FACTIONS[player.faction] : null))}</p><div class="info-callout">${escape(t('victoryHint'))}</div>${state.mode === 'online' && state.room ? `<p class="room-code">${escape(t('room', { code: state.room.code }))}</p><div class="button-row">${button('copy-code', t('copyCode'), { className: 'button secondary' })}${button('copy-invite', t('copyInvite'), { className: 'button secondary' })}</div>` : `<p class="muted">${escape(t('practiceHint'))}</p>`}${button('help', t('help'), { className: 'button secondary wide' })}${state.mode === 'online' && !state.connected ? button('reconnect', t('reconnect'), { className: 'button wide' }) : ''}<p class="hint">${escape(t('portGuide'))}</p>${search}<p class="small muted">${escape(t('deploymentNotice'))}</p></section>`);
    updateCitySearch();
    if (searchFocus && byId('city-search')) { byId('city-search').focus({ preventScroll: true }); byId('city-search').setSelectionRange(...searchFocus); }
    return;
  }
  const player = ownPlayer();
  if (!player || !['practice', 'online'].includes(state.mode)) return renderSetup();
  if (state.tab === 'build') {
    const cards = Object.entries(BUILDINGS).filter(([type]) => type !== 'base').map(([type, meta]) => {
      const reason = buildReason(type, meta);
      const effect = buildingEffect(type);
      return `<button type="button" class="action-card${state.placement?.type === type ? ' selected' : ''}" data-action="build" data-building="${escape(type)}" data-focus-key="build-${escape(type)}" ${reason ? 'disabled' : ''} title="${escape([effect, unlockText(meta), reason].filter(Boolean).join(' '))}"><span class="action-icon">${buildingIcon(type)}</span><span class="action-info"><strong>${escape(label(meta))}</strong><small class="action-effect">${escape(effect)}</small><small>${escape(costText(meta.cost))} · ${escape(actionTime(meta, type))}</small><small class="action-unlock">${escape(unlockText(meta))}</small>${reason ? `<small class="requirement">${escape(reason)}</small>` : ''}</span></button>`;
    }).join('');
    setHTML(nodes['action-content'], `<section class="panel-section">${renderGuide()}<p class="hint">${escape(t('buildHint'))}</p><div class="action-grid">${cards}</div></section>`);
  }
  if (state.tab === 'train') {
    const cards = Object.entries(UNITS).map(([type, meta]) => {
      const reason = trainReason(type, meta);
      const title = type === 'hero' ? label(factionOf()?.hero) : type === 'unique' ? label(factionOf()?.unique) : label(meta);
      const effect = unitEffect(type);
      return `<button type="button" class="action-card" data-action="train" data-unit="${escape(type)}" data-focus-key="train-${escape(type)}" ${reason ? 'disabled' : ''} title="${escape([effect, unlockText(meta, meta.building), reason].filter(Boolean).join(' '))}"><span class="action-icon">${unitIcon(type)}</span><span class="action-info"><strong>${escape(title)}</strong><small class="action-effect">${escape(effect)}</small><small>${escape(costText(meta.cost))} · ${escape(actionTime(meta))}</small><small class="action-unlock">${escape(unlockText(meta, meta.building))}</small>${reason ? `<small class="requirement">${escape(reason)}</small>` : ''}</span></button>`;
    }).join('');
    setHTML(nodes['action-content'], `<section class="panel-section">${renderGuide()}<p class="hint">${escape(t('trainHint'))}</p><div class="action-grid">${cards}</div>${renderQueue(player.queue)}</section>`);
  }
  if (state.tab === 'tech') {
    const upgrade = Data.BASE_UPGRADES?.[player.level + 1] || null;
    const upgrading = items(player.queue).some(item => item.type === 'upgrade');
    const upgradeReason = !canPlay() ? t('cannotCommand') : upgrading ? t('upgrading') : !upgrade ? t('maxLevel') : resourceReason(upgrade.cost);
    const techCards = Object.entries(Data.TECHS || {}).map(([tech, meta]) => {
      const researched = Boolean(player.research?.[tech]);
      const queued = items(player.queue).some(item => item.type === 'research' && item.tech === tech);
      const researchBusy = items(player.queue).some(item => item.type === 'research');
      const reason = !canPlay() ? t('cannotCommand') : researched ? t('researched') : queued ? t('researching') : researchBusy ? t('researchBusy') : player.level < (meta.level || 1) ? t('needsTier', { n: meta.level }) : resourceReason(meta.cost);
      const effect = techEffect(tech);
      return `<button type="button" class="action-card" data-action="research" data-tech="${escape(tech)}" data-focus-key="tech-${escape(tech)}" ${reason ? 'disabled' : ''} title="${escape([effect, unlockText(meta), reason].filter(Boolean).join(' '))}"><span class="action-icon">${tech === 'weapons' ? '⚔' : tech === 'armor' ? '◈' : '↔'}</span><span class="action-info"><strong>${escape(label(meta) || t(tech))}</strong><small class="action-effect">${escape(effect)}</small><small>${escape(costText(meta.cost))} · ${escape(actionTime(meta, 'research'))}</small><small class="action-unlock">${escape(unlockText(meta))}</small>${reason ? `<small class="requirement">${escape(reason)}</small>` : ''}</span></button>`;
    }).join('');
    setHTML(nodes['action-content'], `<section class="panel-section">${renderGuide()}<p class="hint">${escape(t('upgradeHint'))}</p><div class="mode-card"><strong>${escape(t('baseUpgrade'))} · ${escape(t('tier', { n: Math.min(3, player.level + 1) }))}</strong><p class="action-effect">${escape(upgrade ? t(player.level < 2 ? 'upgradeTwoEffect' : 'upgradeThreeEffect') : t('maxLevel'))}</p><p class="small muted">${escape(upgrade ? `${costText(upgrade.cost)} · ${actionTime(upgrade)}` : '')}</p>${button('upgrade', upgradeReason || t('baseUpgrade'), { className: 'button wide', disabled: Boolean(upgradeReason), reason: upgradeReason })}</div><p class="hint">${escape(t('researchHint'))}</p><div class="action-grid">${techCards}</div>${renderQueue(player.queue)}</section>`);
  }
}

function buildingIcon(type) { return { farm: '田', workshop: '工', barracks: '⚑', stable: '♞', arsenal: '⚒', housing: '⌂', tower: '♜', camp: '△' }[type] || '◇'; }
function unitIcon(type) { return { spear: '↟', archer: '⌁', cavalry: '♞', siege: '⚒', unique: '✦', hero: '★' }[type] || '⚑'; }
function resourceReason(cost = {}) {
  const player = ownPlayer();
  return (player?.food || 0) < (cost.food || 0) || (player?.silver || 0) < (cost.silver || 0) ? t('noResources') : '';
}
function buildReason(type, meta) {
  const player = ownPlayer();
  if (!canPlay()) return t('cannotCommand');
  if (type === 'camp' && player.faction !== 'yuan') return t('yuanOnly');
  if (player.level < (meta.level || 1)) return t('needsTier', { n: meta.level });
  if (meta.limit && items(state.snapshot?.buildings).filter(building => building.owner === state.playerId && building.type === type && !building.temporary).length >= meta.limit) return t('buildingLimit');
  return resourceReason(meta.cost);
}
function trainReason(type, meta) {
  const player = ownPlayer();
  if (!canPlay()) return t('cannotCommand');
  if (player.level < (meta.level || 1)) return t('needsTier', { n: meta.level });
  if (type === 'hero') {
    if (items(state.snapshot?.units).some(unit => unit.owner === state.playerId && unit.type === 'hero') || items(player.queue).some(item => item.unit === 'hero')) return t('heroesLimit');
    if ((player.heroReadyAt || 0) > state.snapshot.time) return t('cooldown', { n: Math.ceil(player.heroReadyAt - state.snapshot.time) });
  }
  const selectedBuilding = selectedEntities().find(entity => entity.entityKind === 'building' && entity.owner === state.playerId && (entity.type === meta.building || entity.type === 'camp' && type !== 'hero' && type !== 'siege') && entity.progress >= 1 && !entity.packing);
  const suitable = items(state.snapshot?.buildings).filter(building => building.owner === state.playerId && (building.type === meta.building || building.type === 'camp' && type !== 'hero' && type !== 'siege') && building.progress >= 1 && !building.packing);
  if (meta.building && !suitable.length) return t('needsBuilding', { building: label(BUILDINGS[meta.building]) });
  if (selectedBuilding && items(player.queue).filter(item => item.type === 'train' && item.buildingId === selectedBuilding.id).length >= 5 || suitable.length && suitable.every(building => items(player.queue).filter(item => item.type === 'train' && item.buildingId === building.id).length >= 5)) return t('trainingFull');
  if (type !== 'hero' && items(state.snapshot?.units).filter(unit => unit.owner === state.playerId && unit.type !== 'hero').length + items(player.queue).filter(item => item.unit && item.unit !== 'hero').length >= player.capacity) return t('capacityFull');
  return resourceReason(meta.cost);
}
function renderQueue(queue) {
  const entries = items(queue);
  if (!entries.length) return '';
  return `<div class="queue-list"><strong>${escape(t('queue'))}</strong>${entries.slice(0, 6).map(item => {
    const name = item.unit ? entityName({ type: item.unit, owner: state.playerId, entityKind: 'unit' }) : item.tech ? label(Data.TECHS?.[item.tech]) || t(item.tech) : t('baseUpgrade');
    const remaining = item.remaining ?? Math.max(0, (item.finishAt ?? item.endTime ?? state.snapshot?.time) - (state.snapshot?.time || 0));
    return `<span>${escape(t('queueItem', { name, n: Math.ceil(remaining) }))}</span>`;
  }).join('')}</div>`;
}

function renderSetup() {
  if (state.mode === 'online' && state.lobby) {
    const lobby = state.lobby;
    const me = lobby.players.find(player => player.id === state.playerId);
    const locked = lobby.phase === 'playing' || state.mapMismatch;
    const online = lobby.players.filter(player => player.connected);
    const startAllowed = state.connected && online.length >= 2 && lobby.players.every(player => player.connected && player.ready) && !locked;
    const players = lobby.players.map(player => `<li class="lobby-player${player.id === state.playerId ? ' is-you' : ''}"><span class="player-avatar" style="--faction-color:${escape(FACTIONS[player.faction]?.color || '#888')}"></span><span><strong>${escape(player.name)}${player.id === state.playerId ? ` · ${escape(t('you'))}` : ''}</strong><small>${escape(label(FACTIONS[player.faction]))}${player.id === lobby.hostId ? ` · ${escape(t('host'))}` : ''}</small></span><span class="badge${player.ready ? ' ready' : ''}">${escape(player.connected ? t(player.ready ? 'ready' : 'notReady') : t('disconnected'))}</span></li>`).join('');
    setHTML(nodes['action-content'], `<section class="panel-section"><div class="eyebrow">${escape(t('matchmaking'))}</div><h2>${escape(t('room', { code: lobby.code }))}</h2>${state.mapMismatch ? `<div class="warning-note">${escape(t('mapMismatch'))}</div>${button('reload-map', t('refreshPage'), { className: 'button primary wide' })}` : ''}<div class="button-row">${button('copy-code', t('copyCode'), { className: 'button secondary' })}${button('copy-invite', t('copyInvite'), { className: 'button secondary' })}</div><ul class="player-list">${players}</ul><h3>${escape(t('faction'))}</h3>${factionCards(locked || !state.connected)}<p class="small muted">${escape(locked ? t('roomLocked') : t('factionHint'))}</p>${button('ready', t(me?.ready ? 'unreadyButton' : 'readyButton'), { className: 'button wide', disabled: locked || !state.connected })}${lobby.hostId === state.playerId ? button('start-match', t('startMatch'), { className: 'button primary wide', disabled: !startAllowed, reason: t('startNeedsPlayers') }) : `<p class="small muted">${escape(t('waitingHost'))}</p>`}${!locked ? `<p class="small muted">${escape(t('startNeedsPlayers'))}</p>` : ''}${!state.connected ? button('reconnect', t('reconnect'), { className: 'button secondary wide' }) : ''}${button('leave-room', t('leaveRoom'), { className: 'button ghost wide' })}</section>`);
    return;
  }
  const base = serverBase();
  setHTML(nodes['action-content'], `<section class="panel-section setup-panel"><h2 class="intro-heading">${escape(t('brand'))}</h2><p class="intro-copy">${escape(t('previewHint'))}</p><label class="field-label" for="commander-name">${escape(t('commanderName'))}</label><input id="commander-name" data-focus-key="commander-name" class="text-input" maxlength="24" autocomplete="nickname" value="${escape(state.name)}" placeholder="${escape(t('defaultName'))}"><h3>${escape(t('faction'))}</h3>${factionCards()}${button('practice', t('startPractice'), { className: 'button primary wide' })}<div class="input-row practice-settings"><label for="bot-count">${escape(t('bots'))}</label><select id="bot-count" class="text-input" data-focus-key="bot-count">${[1, 2, 3].map(n => `<option value="${n}" ${n === state.botCount ? 'selected' : ''}>${escape(t('botCount', { n }))}</option>`).join('')}</select></div><p class="small muted">${escape(t('practiceHint'))}</p><p class="opening-route">${escape(t('openingRoute'))}</p><div class="mode-card"><h3>${escape(t('friends'))}</h3><p class="small muted">${escape(t(base ? 'friendsHint' : 'noServiceHint'))}</p>${button('create-room', state.busy ? t('backendBusy') : t('createRoom'), { className: 'button wide', disabled: state.busy || !base })}<div class="input-row"><input id="join-code" class="text-input" data-focus-key="join-code" value="${escape(state.joinCode)}" maxlength="12" inputmode="text" autocapitalize="characters" autocomplete="off" placeholder="${escape(t('roomCodePlaceholder'))}" aria-label="${escape(t('roomCode'))}">${button('join-room', t('joinRoom'), { disabled: state.busy || !base })}</div>${savedRoom?.code && savedRoom?.token ? button('resume-room', t('resumeRoom'), { className: 'button secondary wide', disabled: state.busy }) : ''}${button('configure-service', t('configureService'), { className: 'button ghost wide' })}</div>${button('help', t('help'), { className: 'button ghost wide' })}</section>`);
}

function selectedCityMeta(city) { return CITY_META.get(city.controllingCityId || city.id) || city; }

function cityGeoDetails(city) {
  const meta = selectedCityMeta(city);
  const coordinates = Number.isFinite(meta.lon) && Number.isFinite(meta.lat) ? `${Math.abs(meta.lon).toFixed(4)}° ${meta.lon < 0 ? 'W' : 'E'} · ${Math.abs(meta.lat).toFixed(4)}° ${meta.lat < 0 ? 'S' : 'N'}` : '';
  const originalName = meta.nameZhSource || meta.sourceName || meta.name;
  const sourceName = originalName === meta.nameEn ? meta.nameEn : `${originalName || ''} / ${meta.nameEn || ''}`;
  return `<div class="city-geography">${coordinates ? `<p>${escape(t('coordinates'))}: ${escape(coordinates)}</p>` : ''}${meta.sourceId != null ? `<details class="source-details" data-source-city="${escape(meta.id)}" ${state.sourceExpanded.has(meta.id) ? 'open' : ''}><summary data-focus-key="source-${escape(meta.id)}">${escape(t('sourceDetails'))}</summary><p>${escape(t('sourcePlace'))}: ${escape(sourceName)}</p><p>${escape(t('sourceRecord'))}: Natural Earth · NE_ID ${escape(meta.sourceId)}</p></details>` : ''}</div>`;
}

function portDetails(city) {
  const meta = selectedCityMeta(city);
  if (!meta.port) return '';
  const dynamic = campaignCities().cities.get(meta.id) || city;
  const targetIds = new Set(Array.isArray(dynamic.shippingTargets) ? dynamic.shippingTargets : []);
  for (const lane of items(WORLD.shippingLanes)) {
    if (lane.fromId === meta.id) targetIds.add(lane.toId);
    if (lane.toId === meta.id) targetIds.add(lane.fromId);
  }
  const targets = [...targetIds].map(id => CITY_META.get(id)).filter(Boolean);
  const links = targets.slice(0, 20).map(target => button('inspect-city', `${label(target)} · ${ownerName(campaignCities().cities.get(target.id)?.owner)}`, { className: 'button secondary port-target', data: { city: target.id, zoom: 5, 'focus-key': `port-${meta.id}-${target.id}` } })).join('');
  return `<section class="port-details"><strong>${escape(t('portTransport'))}</strong><p>${escape(t(dynamic.owner === state.playerId ? 'portOwned' : 'portNotOwned'))}</p><p>${escape(t('portGuide'))}</p>${targets.length ? `<details class="port-routes"><summary>${escape(t('portTargets', { n: targets.length }))}</summary><div class="port-target-list">${links}</div>${targets.length > 20 ? `<p>${escape(t('portTargetsMore', { n: targets.length - 20 }))}</p>` : ''}</details>` : `<p>${escape(t('portNoRoutes'))}</p>`}</section>`;
}

function transitLabel(unit) {
  const port = CITY_META.get(unit.transit?.toPort);
  return t('transitDetail', { name: entityName(unit), port: port ? label(port) : t('port'), n: Math.max(0, Math.ceil(unit.transit?.remaining || 0)) });
}

function renderSelection() {
  const coverActive = Boolean(nodes['game-cover']) && state.mode === 'preview' && !state.coverHidden;
  const selected = coverActive ? [] : selectedEntities();
  let html = coverActive ? `<div class="selection-empty"><span class="selection-icon">旗</span><p>${escape(t('coverRoute'))}</p><small>${escape(t('coverRouteDetail'))}</small></div>` : `<div class="selection-empty"><span class="selection-icon">⌖</span><p>${escape(t('selectedNothing'))}</p><small>${escape(t('groups'))}</small></div>`;
  if (selected.length) {
    const entity = selected[0];
    const units = selected.filter(item => item.entityKind === 'unit');
    const ownUnits = units.filter(item => item.owner === state.playerId);
    const hero = ownUnits.find(item => item.type === 'hero');
    const hp = selected.reduce((sum, item) => sum + (item.hp || 0), 0);
    const maxHp = selected.reduce((sum, item) => sum + (item.maxHp || 0), 0);
    const owner = entity.owner === state.playerId ? t('own') : entity.owner ? ownerName(entity.owner) : t('neutral');
    let details = '';
    if (['city', 'region'].includes(entity.entityKind)) {
      details = entity.visible === false ? `<p class="small muted">${escape(t('cityUnseen'))}</p>` : `<p class="small">${escape(t('guard'))}: ${number(entity.guardHp)}</p>${entity.capture?.owner ? `<p class="small">${escape(t('capturing', { n: Math.round(entity.capture.progress * 100) }))}</p>` : ''}${entity.settleUntil > state.snapshot.time ? `<p class="small">${escape(t('settling', { n: Math.ceil(entity.settleUntil - state.snapshot.time) }))}</p>` : ''}${entity.owner === state.playerId ? `<p class="small muted">${escape(t(entity.connected ? 'connectedCity' : 'cutOffCity'))}</p>` : ''}`;
      details += `<p class="small muted">${escape(t('cityHint', CITY_RULES))}</p>`;
      if (entity.port) details += `<p class="small">${escape(t('port'))} · ${escape(t(entity.owner === state.playerId ? 'portOwned' : 'portNotOwned'))}</p>`;
    }
    if (entity.entityKind === 'building') details = `<p class="small muted">${escape(buildingEffect(entity.type))}</p>${entity.progress < 1 ? `<p class="small">${escape(t('constructing', { n: Math.round(entity.progress * 100) }))}</p>` : ''}${entity.owner === state.playerId ? renderQueue(entity.queue) : ''}`;
    if (entity.packing) details += `<p class="small">${escape(t('migrating', { n: Math.ceil(entity.packing.remaining) }))}</p>`;
    if (entity.type === 'hero') details += `<p class="small muted">${escape(description(factionOf(entity.owner)?.hero))}</p>`;
    const transported = ownUnits.filter(unit => unit.transit);
    if (transported.length) details += `<p class="small">${escape(t('transitSummary', { n: transported.length }))}</p>${transported.slice(0, 3).map(unit => `<p class="small muted">${escape(transitLabel(unit))}</p>`).join('')}`;
    if (entity.transit && entity.owner !== state.playerId) details += `<p class="small muted">${escape(t('seaTransit'))}</p>`;
    if (regionName(entity)) details = `<p class="small">${escape(t('territory'))}: ${escape(regionName(entity))}${entity.kind === 'fort' ? ` · ${escape(t('frontierFort'))}` : ''}</p>${details}`;
    const counts = [...new Set(units.map(unit => unit.type))].map(type => `<span class="unit-chip">${escape(entityName({ ...units.find(unit => unit.type === type), entityKind: 'unit' }))} × ${units.filter(unit => unit.type === type).length}</span>`).join('');
    const readyAt = hero?.skillReadyAt || 0;
    const skillReady = hero && !hero.transit && readyAt <= (state.snapshot?.time || 0) && canPlay();
    const skillTitle = hero ? (lang === 'en' ? factionOf(hero.owner)?.hero?.skillNameEn : factionOf(hero.owner)?.hero?.skillName) || t('skill') : t('skill');
    const holdReason = transported.length ? t('transitOrdersWait') : !canPlay() ? t('cannotCommand') : '';
    const packReason = entity.packing ? t('migrating', { n: Math.ceil(entity.packing.remaining) }) : items(entity.queue).length ? t('trainingBusy') : entity.progress < 1 ? t('constructing', { n: Math.round(entity.progress * 100) }) : !canPlay() ? t('cannotCommand') : '';
    html = `<div class="selection-details"><div class="selection-heading"><span class="selection-icon">${entity.entityKind === 'unit' ? unitIcon(entity.type) : entity.entityKind === 'city' ? '城' : buildingIcon(entity.type)}</span><div><span class="eyebrow">${escape(owner)}</span><h3>${escape(selected.length > 1 ? t('selectedUnits', { n: selected.length }) : entityName(entity))}</h3></div></div>${entity.visible === false ? '' : `<div class="health-bar" role="meter" aria-label="${escape(t('health'))}" aria-valuemin="0" aria-valuemax="${number(maxHp)}" aria-valuenow="${number(hp)}"><span style="width:${Math.min(100, maxHp ? hp / maxHp * 100 : 0)}%"></span></div><p class="small muted">${escape(t('health'))} ${number(hp)} / ${number(maxHp)}</p>`}${counts ? `<div class="unit-chips">${counts}</div>` : ''}${details}</div><div class="selection-actions">${button('focus-selected', t('focus'), { className: 'button secondary' })}${ownUnits.length ? button('hold', t('hold'), { className: 'button secondary', disabled: Boolean(holdReason), reason: holdReason }) : ''}${hero ? button('skill', `${skillTitle} · ${hero.transit ? t('seaTransit') : skillReady ? 'Q' : t('cooldown', { n: Math.max(0, Math.ceil(readyAt - state.snapshot.time)) })}`, { className: 'button', disabled: !skillReady }) : ''}${entity.type === 'camp' && entity.owner === state.playerId ? button('pack', t('migrate'), { className: 'button secondary', disabled: Boolean(packReason), reason: packReason }) : ''}<small class="muted">${escape(t('groups'))}</small></div>`;
  }
  if (state.placement && !coverActive) html += `<div class="placement-banner">${escape(state.placement.kind === 'build' ? t('placement', { name: label(BUILDINGS[state.placement.type]) }) : t(state.placement.kind === 'pack' ? 'packPlacement' : 'skillPlacement'))}</div>`;
  setHTML(nodes['selection-panel'], html);
  if (nodes.inspector) {
    nodes.inspector.hidden = !selected.length;
    const entities = selected.slice(0, 1);
    const inspected = entities[0];
    const explanation = inspected && ['city', 'region'].includes(inspected.entityKind) ? `<p class="entity-effect">${escape(cityEffect(inspected))}</p>${inspected.owner === state.playerId && !inspected.connected ? `<p>${escape(t('citySupplyHint'))}</p>` : ''}${cityGeoDetails(inspected)}${portDetails(inspected)}` : inspected?.entityKind === 'unit' ? `<p class="entity-effect">${escape(unitEffect(inspected.type, inspected.owner))}</p>${inspected.type === 'hero' ? `<p>${escape(description(factionOf(inspected.owner)?.hero))}</p><p>${escape(t('heroRecovery', { n: Data.RULES?.heroRespawnDelay || 60 }))}</p>` : ''}` : '';
    setHTML(nodes.inspector, inspected ? `<strong>${escape(regionName(inspected) || entityName(inspected))}</strong><p>${escape(entityName(inspected))} · ${escape(inspected.owner ? ownerName(inspected.owner) : t('neutral'))}</p>${explanation}` : `<span>${escape(t('selectArmy'))}</span>`);
  }
}

function renderEvents() {
  const events = items(state.snapshot?.events).slice(-12).reverse();
  setHTML(nodes['event-list'], events.length ? events.map(event => `<li class="event-item event-${escape(event.type)}"><time>${timeLabel(event.time)}</time><span>${escape(lang === 'en' ? event.textEn || event.text : event.text)}</span></li>`).join('') : `<li class="event-empty">${escape(t('noEvents'))}</li>`);
}
function renderRoomPanel() {
  const players = state.mode === 'online' && state.lobby ? state.lobby.players.map(player => ({ ...player, alive: items(state.snapshot?.players).find(item => item.id === player.id)?.alive ?? true })) : state.mode === 'preview' ? [] : items(state.snapshot?.players);
  const ownedCities = items(state.snapshot?.cities).filter(city => city.owner === state.playerId);
  const territoryCount = items(WORLD.regions).filter(region => campaignCities().cities.get(region.cityId)?.owner === state.playerId).length;
  const total = items(WORLD.regions).length || items(state.snapshot?.cities).length;
  const economicCount = ownedCities.filter(city => ['food', 'silver'].includes(city.kind)).length;
  const stats = ['practice', 'online'].includes(state.mode) && ownPlayer() && state.snapshot?.status === 'playing' ? `<div class="stat-row"><span>${escape(t('territoryCount', { n: territoryCount, total }))}</span><span>${escape(t('citiesControlled', { owned: ownedCities.length, total: CITY_CATALOG.length }))}</span><span>${escape(t('economicCities', { n: economicCount }))}</span></div>` : '';
  setHTML(nodes['room-panel'], players.length ? `<div class="player-strip">${players.map(player => `<span class="player-chip${player.alive === false ? ' eliminated' : ''}${player.id === state.playerId ? ' is-you' : ''}"><i style="background:${escape(FACTIONS[player.faction]?.color || '#888')}"></i>${escape(player.name)}${player.alive === false ? ` · ${escape(t('dead'))}` : ''}</span>`).join('')}</div>${stats}` : '');
}

function canFocus(element) {
  return Boolean(element && element !== document.body && !element.disabled && !element.hidden && !element.closest('[hidden], [inert]') && element.getClientRects().length && typeof element.focus === 'function');
}
function dialogFocusables() {
  const elements = [...(nodes['dialog-layer']?.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, a[href], [tabindex]:not([tabindex="-1"])') || [])].filter(canFocus);
  const checkedGroups = new Set(elements.filter(element => element.type === 'radio' && element.checked).map(element => element.name));
  return elements.filter(element => element.type !== 'radio' || element.checked || !checkedGroups.has(element.name));
}
function showDialog(type, extra = {}, trigger = document.activeElement) {
  if (!state.dialog) state.dialogReturnFocus = { element: trigger, key: trigger?.getAttribute?.('data-focus-key') || trigger?.id || '' };
  state.dialog = { type, ...extra };
  renderDialog();
}
function closeDialog() {
  const destination = state.dialogReturnFocus;
  state.dialogReturnFocus = null; state.dialog = null;
  if (nodes['dialog-layer']) { nodes['dialog-layer'].innerHTML = ''; nodes['dialog-layer'].hidden = true; }
  if (destination) requestAnimationFrame(() => {
    if (state.dialog) return;
    const matched = destination.key ? [...document.querySelectorAll('[data-focus-key], [id]')].find(element => (element.getAttribute('data-focus-key') || element.id) === destination.key) : null;
    const target = destination.element?.isConnected && canFocus(destination.element) ? destination.element : canFocus(matched) ? matched : nodes['settings-toggle'];
    if (canFocus(target)) target.focus({ preventScroll: true });
  });
}
function settingsContent() {
  const option = (group, value, title, hint, checked) => `<label class="settings-option${checked ? ' selected' : ''}"><input type="radio" name="settings-${group}" id="settings-${group}-${value}" value="${value}" ${checked ? 'checked' : ''}><span><strong>${escape(t(title))}</strong><small>${escape(t(hint))}</small></span></label>`;
  return `<h2>${escape(t('settings'))}</h2><p class="settings-note">${escape(t('settingsIntro'))}</p><div class="settings-panel"><fieldset class="settings-section"><legend>${escape(t('settingsAppearance'))}</legend><div class="settings-options">${option('theme', 'light', 'light', 'settingsLightHint', theme === 'light')}${option('theme', 'dark', 'dark', 'settingsDarkHint', theme === 'dark')}</div></fieldset><fieldset class="settings-section"><legend>${escape(t('settingsMapMode'))}</legend><div class="settings-options">${option('mode', 'pan', 'settingsPan', 'settingsPanHint', state.preferences.mode === 'pan')}${option('mode', 'select', 'settingsSelect', 'settingsSelectHint', state.preferences.mode === 'select')}</div></fieldset><label class="settings-row" for="settings-wheel"><span>${escape(t('settingsWheel'))}</span><select id="settings-wheel" class="text-input">${[['comfortable', 'wheelComfortable'], ['normal', 'wheelNormal'], ['fast', 'wheelFast']].map(([value, key]) => `<option value="${value}" ${state.preferences.wheel === value ? 'selected' : ''}>${escape(t(key))}</option>`).join('')}</select></label><div class="settings-section"><label class="settings-switch" for="settings-reduced-motion"><input id="settings-reduced-motion" type="checkbox" ${reducedMotionMedia?.matches || state.preferences.reducedMotion ? 'checked' : ''} ${reducedMotionMedia?.matches ? 'disabled' : ''}><span>${escape(t('settingsReducedMotion'))}</span></label><p class="settings-note" id="settings-motion-note">${escape(t(reducedMotionMedia?.matches ? 'settingsMotionSystem' : 'settingsMotionHint'))}</p></div><details class="advanced-settings" id="settings-advanced" ${state.dialog?.advancedOpen ? 'open' : ''}><summary>${escape(t('settingsAdvanced'))}</summary><p class="settings-note">${escape(t('settingsAdvancedHint'))}</p><label class="field-label" for="service-url">${escape(t('serviceUrl'))}</label><input id="service-url" class="text-input" type="url" inputmode="url" autocomplete="url" placeholder="${escape(t('serviceUrlPlaceholder'))}" value="${escape(state.dialog?.serviceDraft ?? state.backend)}"><p class="settings-note">${escape(t('settingsNextRoom'))}</p>${button('save-service', t('saveService'), { className: 'button secondary', data: { 'focus-key': 'save-service' } })}</details></div>${button('close-dialog', t('settingsDone'), { className: 'button primary wide' })}`;
}
function renderDialog() {
  if (!state.dialog || !nodes['dialog-layer']) return;
  const dialog = state.dialog;
  const previousFocus = nodes['dialog-layer'].contains(document.activeElement) ? document.activeElement : null;
  const focusKey = previousFocus?.getAttribute('data-focus-key') || previousFocus?.id;
  const selection = previousFocus instanceof HTMLInputElement ? [previousFocus.selectionStart, previousFocus.selectionEnd] : null;
  let content = '';
  if (state.dialog.type === 'settings') content = settingsContent();
  if (state.dialog.type === 'help') content = `<h2>${escape(t('help'))}</h2><p>${escape(t('openingRoute'))}</p><ol class="help-steps">${['helpEconomy', 'helpCombat', 'helpUpgrade', 'helpCity', 'helpEconomyCities', 'helpVictory', 'helpHero', 'helpPorts'].map(key => `<li>${escape(t(key, CITY_RULES))}</li>`).join('')}</ol><details class="help-details"><summary>${escape(t('controlsTitle'))}</summary><p>${escape(t('helpControls'))}</p><p>${escape(t('groups'))}</p></details><details class="help-details"><summary>${escape(t('helpAdvanced'))}</summary><p>${escape(t('helpSupply'))}</p><p>${escape(t('scoreWin'))}</p><p>${escape(t('geographyHint', { n: CITY_CATALOG.length, regions: REGION_META.size }))}</p></details>${button('close-dialog', t('close'), { className: 'button primary wide' })}`;
  if (state.dialog.type === 'service') content = `<h2>${escape(t('configureService'))}</h2><p class="muted">${escape(t('serviceHint'))}</p><label class="field-label" for="service-url">${escape(t('serviceUrl'))}</label><input id="service-url" class="text-input" type="url" inputmode="url" autocomplete="url" placeholder="${escape(t('serviceUrlPlaceholder'))}" value="${escape(state.backend)}"><div class="button-row">${button('save-service', t('saveService'), { className: 'button primary' })}${button('close-dialog', t('cancel'), { className: 'button secondary' })}</div>`;
  if (state.dialog.type === 'home') content = `<h2>${escape(t('returnHomeTitle'))}</h2><p class="muted">${escape(t('returnHomeHint'))}</p><div class="button-row">${button('confirm-home', t('confirmHome'), { className: 'button primary' })}${button('close-dialog', t('cancel'), { className: 'button secondary' })}</div>`;
  if (state.dialog.type === 'copy') content = `<h2>${escape(t('copyInvite'))}</h2><p class="muted">${escape(t('copyFailed'))}</p><input class="text-input" id="copy-value" readonly value="${escape(state.dialog.value)}" aria-label="${escape(t('copyInvite'))}">${button('close-dialog', t('close'), { className: 'button wide' })}`;
  if (state.dialog.type === 'ended') {
    const winner = state.snapshot?.winner;
    const title = winner?.draw ? t('draw') : winner?.playerId === state.playerId ? t('victory') : t('defeat');
    const reason = winner?.reason === 'score' ? t('scoreWin') : winner?.draw ? t('mutualExit') : winner?.reason === 'crown' || winner?.reason === 'capital' ? t('crownWin') : t('eliminationWin');
    content = `<div class="result-emblem">${winner?.draw ? '◇' : winner?.playerId === state.playerId ? '冠' : '旗'}</div><span class="eyebrow">${escape(t('gameOver'))}</span><h2>${escape(title)}</h2><p>${escape(winner?.draw ? t('draw') : t('winner', { name: ownerName(winner?.playerId) }))}</p><p class="muted">${escape(reason)}</p><p class="small muted">${escape(t('time'))} ${timeLabel(state.snapshot?.time)}</p>${state.mode === 'practice' ? button('practice', t('again'), { className: 'button primary wide' }) : button('back-room', t('backRoom'), { className: 'button primary wide' })}${button('confirm-home', t('backHome'), { className: 'button secondary wide' })}`;
  }
  nodes['dialog-layer'].hidden = false;
  nodes['dialog-layer'].innerHTML = `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">${content.replace('<h2>', '<h2 id="modal-title">')}</section></div>`;
  syncSettingsFields();
  requestAnimationFrame(() => {
    if (state.dialog !== dialog) return;
    const replacement = focusKey ? [...nodes['dialog-layer'].querySelectorAll('[data-focus-key], [id]')].find(element => (element.getAttribute('data-focus-key') || element.id) === focusKey) : null;
    const target = canFocus(replacement) ? replacement : dialogFocusables()[0] || nodes['dialog-layer'].querySelector('.modal');
    target?.focus({ preventScroll: true });
    if (selection && target instanceof HTMLInputElement) { try { target.setSelectionRange(...selection); } catch { /* Non-text inputs do not expose selection ranges. */ } }
  });
}

async function copyText(value) {
  try { if (!navigator.clipboard?.writeText) throw new Error('clipboard'); await navigator.clipboard.writeText(value); toast(t('copied')); }
  catch { showDialog('copy', { value }); requestAnimationFrame(() => { byId('copy-value')?.focus(); byId('copy-value')?.select(); }); }
}
function inviteLink() {
  const url = new URL(location.href);
  url.searchParams.set('room', state.room?.code || state.lobby?.code || '');
  url.searchParams.set('lang', lang);
  const roomBackend = state.room?.backend || state.backend;
  if (roomBackend) url.searchParams.set('server', roomBackend); else url.searchParams.delete('server');
  return url.href;
}

async function roomRequest(join = false) {
  if (state.busy) return;
  captureSetupInputs();
  const commanderName = state.name.trim() || t('defaultName');
  const base = serverBase();
  if (!base) return showDialog('settings', { advancedOpen: true });
  const code = join ? byId('join-code')?.value.trim().toUpperCase() : '';
  if (join && !/^[A-Z0-9-]{3,12}$/.test(code || '')) return toast(t('roomInvalid'));
  state.busy = true; render();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${base}/api/rooms${join ? `/${encodeURIComponent(code)}/join` : ''}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: commanderName, faction: state.faction }), signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || t('requestFailed', { status: response.status }));
    if (!data.code || !data.playerId || !data.token) throw new Error(t('networkError'));
    state.room = { code: data.code, playerId: data.playerId, token: data.token, backend: base, seq: 0 };
    state.seq = 0;
    savedRoom = state.room; writeStore('roomtoken', JSON.stringify(savedRoom));
    state.mode = 'online'; state.game = null; state.playerId = data.playerId; state.tab = 'lobby'; state.lobby = null; state.selected = []; state.groups.clear(); state.endedKey = ''; cancelPlacement();
    connectRoom();
  } catch (error) { toast(error?.name === 'AbortError' ? t('networkError') : errorText(error?.message) || t('networkError')); }
  finally { clearTimeout(timeout); state.busy = false; render(); }
}

function sendSocket(message) {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) return false;
  state.socket.send(JSON.stringify(message));
  return true;
}

function checkMapVersion(version) {
  if (!version || !WORLD.mapVersion || version === WORLD.mapVersion) return true;
  const key = `${state.room?.code || ''}:${String(version)}`;
  if (state.mapMismatchKey !== key) {
    state.mapMismatchKey = key; state.mapMismatch = true; state.snapshot = null; state.selected = []; state.groups.clear(); state.endedKey = ''; state.tab = 'lobby';
    cancelPlacement(); closeDialog(); battlefield.setSnapshot(null); toast(t('mapMismatch'));
  }
  return false;
}
function disconnectSocket(leave = true) {
  state.intentionalClose = true;
  clearTimeout(state.reconnectTimer);
  if (leave) sendSocket({ type: 'leave' });
  const socket = state.socket;
  state.socket = null; state.connected = false; state.reconnectAt = 0; state.reconnectAttempt = 0; state.reconnectStopped = false;
  if (socket) { socket.onclose = null; socket.onerror = null; socket.onmessage = null; socket.close(); }
  state.pending.clear();
}
function connectRoom(reconnect = false) {
  if (!state.room) return;
  clearTimeout(state.reconnectTimer);
  state.intentionalClose = false;
  state.reconnectStopped = false;
  if (state.socket) { state.socket.onclose = null; state.socket.close(); }
  let url;
  try {
    url = new URL(`${state.room.backend || serverBase()}/api/rooms/${encodeURIComponent(state.room.code)}/ws`);
    if (location.protocol === 'https:' && url.protocol === 'http:') throw new Error(t('insecureService'));
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  } catch (error) { toast(error.message || t('invalidService')); return; }
  const socket = new WebSocket(url.href);
  let receivedFullSnapshot = false;
  state.socket = socket;
  socket.onopen = () => { if (socket === state.socket) socket.send(JSON.stringify({ type: 'auth', token: state.room.token })); };
  socket.onmessage = event => {
    if (socket !== state.socket) return;
    let message; try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === 'lobby') {
      const wasDisconnected = !state.connected;
      const hadRetry = Boolean(state.reconnectAt);
      state.connected = true; state.reconnectAt = 0; state.reconnectAttempt = 0;
      if (!checkMapVersion(message.mapVersion)) { state.lobby = message; render(); return; }
      if (state.mapMismatch) { state.mapMismatch = false; state.mapMismatchKey = ''; state.awaitingBattle = message.phase === 'playing'; }
      if (message.resetReason === 'map_updated') {
        const resetKey = `${state.room?.code || message.code}:${WORLD.mapVersion || 'current'}`;
        if (state.resetNotice !== resetKey) {
          receivedFullSnapshot = false;
          state.resetNotice = resetKey; state.snapshot = null; state.selected = []; state.groups.clear(); state.endedKey = ''; state.awaitingBattle = false;
          cancelPlacement(); closeDialog(); battlefield.setSnapshot(null); toast(t('mapUpdated'));
        }
      } else state.resetNotice = '';
      if (message.phase === 'playing' && state.lobby?.phase !== 'playing') {
        receivedFullSnapshot = false;
        state.awaitingBattle = true;
        if (state.lobby) { state.seq = 0; state.room.seq = 0; savedRoom = state.room; writeStore('roomtoken', JSON.stringify(savedRoom)); }
        state.pending.clear();
      }
      state.lobby = message;
      if (message.phase !== 'playing') state.tab = 'lobby';
      if (wasDisconnected && hadRetry) toast(t('reconnected'));
      render();
    }
    if (message.type === 'snapshot') {
      state.connected = true; state.reconnectAt = 0; state.reconnectAttempt = 0;
      if (!checkMapVersion(message.snapshot?.mapVersion) || state.mapMismatch) { render(); return; }
      let incoming;
      try {
        incoming = mergeSnapshot(message.snapshot, receivedFullSnapshot ? state.snapshot : null);
        receivedFullSnapshot = true;
      }
      catch { toast(t('networkError')); socket.close(1011, 'Full snapshot required'); return; }
      const newBattle = incoming?.status === 'playing' && state.awaitingBattle;
      if (newBattle) { state.awaitingBattle = false; state.endedKey = ''; closeDialog(); state.selected = []; state.groups.clear(); }
      setSnapshot(incoming);
      if (newBattle) {
        applyUIPreferences();
        state.tab = 'build';
        const base = ownPlayer()?.base; if (base) battlefield.focus(base.x, base.y);
      }
      render();
    }
    if (message.type === 'ack') { state.pending.delete(message.seq); if (!message.ok) toast(t('commandFailed', { error: errorText(message.error) || t('cannotCommand') })); }
    if (message.type === 'error') toast(errorText(message.message || message.error) || t('networkError'));
  };
  socket.onerror = () => { /* Close drives the single reconnect path. */ };
  socket.onclose = () => {
    if (socket !== state.socket || state.intentionalClose) return;
    state.connected = false; state.pending.clear();
    if (!state.reconnectAt) state.reconnectAt = Date.now();
    if (Date.now() - state.reconnectAt >= 60000) {
      state.reconnectStopped = true; toast(t('reconnectFailed')); render(); return;
    }
    state.reconnectAttempt += 1;
    state.reconnectTimer = setTimeout(() => connectRoom(true), Math.min(5000, 1000 * 2 ** Math.min(3, state.reconnectAttempt - 1)));
    render();
  };
  if (!reconnect) state.reconnectAt = Date.now();
  render();
}

function returnHome() {
  disconnectSocket(true);
  if (state.room) { savedRoom = null; writeStore('roomtoken', null); }
  state.mode = 'preview'; state.coverHidden = false; state.room = null; state.lobby = null; state.selected = []; state.groups.clear(); state.tab = 'lobby'; state.endedKey = ''; state.mapMismatch = false; state.mapMismatchKey = '';
  cancelPlacement(); closeDialog(); createPreview(); render();
}
function retryConnection() {
  if (!state.room && savedRoom) { state.room = { ...savedRoom }; state.playerId = savedRoom.playerId; state.mode = 'online'; state.game = null; state.tab = 'lobby'; state.seq = Number.isSafeInteger(savedRoom.seq) && savedRoom.seq >= 0 ? savedRoom.seq : 0; }
  state.reconnectAt = Date.now(); state.reconnectAttempt = 0; connectRoom(true);
}
function saveService() {
  const input = byId('service-url')?.value.trim() || '';
  let normalized = '';
  if (input) {
    try {
      const url = new URL(input);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('invalid');
      if (location.protocol === 'https:' && url.protocol !== 'https:') return toast(t('insecureService'));
      normalized = url.origin + url.pathname.replace(/\/+$/, '');
    } catch { return toast(t('invalidService')); }
  }
  state.backend = normalized; writeStore('backendURL', normalized); closeDialog(); state.renderCache.clear(); render(); toast(t('serviceSaved'));
}

function handleAction(action, target) {
  if (action === 'view-map') { if (state.mode !== 'preview') return; state.coverHidden = true; renderSelection(); renderCover(); nodes.battlefield?.focus({ preventScroll: true }); return; }
  if (action === 'show-cover') { if (state.mode !== 'preview') return; state.coverHidden = false; state.selected = []; battlefield.setSelection([]); renderSelection(); renderCover(); nodes['cover-begin']?.focus({ preventScroll: true }); return; }
  if (action === 'settings') return showDialog('settings', {}, target);
  if (action === 'guide-hide' || action === 'guide-show') { state.guideVisible = action === 'guide-show'; writeStore('beginnerGuide', state.guideVisible); renderActions(); return; }
  if (action === 'guide-next' && ['build', 'train', 'tech', 'lobby'].includes(target.dataset.tab)) { state.tab = target.dataset.tab; render(); return; }
  if (action === 'reload-map') { location.reload(); return; }
  if (action === 'practice') return startPractice();
  if (action === 'create-room') return roomRequest(false);
  if (action === 'join-room') return roomRequest(true);
  if (action === 'resume-room' || action === 'reconnect') return retryConnection();
  if (action === 'configure-service') return showDialog('settings', { advancedOpen: true }, target);
  if (action === 'save-service') return saveService();
  if (action === 'help') return showDialog('help');
  if (action === 'close-dialog') return closeDialog();
  if (action === 'confirm-home' || action === 'leave-room') return returnHome();
  if (action === 'back-room') { closeDialog(); state.tab = 'lobby'; render(); return; }
  if (action === 'copy-code') return copyText(state.room?.code || state.lobby?.code || '');
  if (action === 'copy-invite') return copyText(inviteLink());
  if (action === 'search-exact') { state.citySearchExact = !state.citySearchExact; updateCitySearch(); return; }
  if (action === 'search-ports') { state.citySearchPorts = !state.citySearchPorts; updateCitySearch(); return; }
  if (action === 'inspect-city') {
    const city = entityById(target.dataset.city);
    if (!city || city.entityKind !== 'city') return;
    cancelPlacement();
    state.selected = [city.id]; battlefield.setSelection([city.id]); battlefield.focus(city.x, city.y, target.dataset.zoom === '5' ? 5 : undefined);
    renderSelection(); renderActions();
    return;
  }
  if (action === 'faction') {
    captureSetupInputs();
    if (!FACTIONS[target.dataset.faction]) return;
    state.faction = target.dataset.faction; writeStore('faction', state.faction);
    if (state.mode === 'online') sendSocket({ type: 'faction', faction: state.faction });
    renderActions(); return;
  }
  if (action === 'ready') { const me = state.lobby?.players.find(player => player.id === state.playerId); sendSocket({ type: 'ready', ready: !me?.ready }); return; }
  if (action === 'start-match') { sendSocket({ type: 'start' }); return; }
  if (action === 'build') return startPlacement('build', { type: target.dataset.building });
  if (action === 'train') {
    const unit = target.dataset.unit;
    const building = selectedEntities().find(entity => entity.entityKind === 'building' && entity.owner === state.playerId && (entity.type === UNITS[unit]?.building || entity.type === 'camp' && unit !== 'hero' && unit !== 'siege') && entity.progress >= 1 && !entity.packing);
    return sendCommand({ type: 'train', unit, ...(building ? { buildingId: building.id } : {}) });
  }
  if (action === 'upgrade') return sendCommand({ type: 'upgrade' });
  if (action === 'research') return sendCommand({ type: 'research', tech: target.dataset.tech });
  if (action === 'hold') { const units = ownSelectedUnits(); if (units.some(unit => unit.transit)) return toast(t('transitOrdersWait')); const ids = units.map(unit => unit.id); if (ids.length) sendCommand({ type: 'hold', ids }); return; }
  if (action === 'skill') {
    const hero = ownSelectedUnits().find(unit => unit.type === 'hero');
    if (hero?.transit) return toast(t('transitWait'));
    if (hero && (hero.skillReadyAt || 0) <= state.snapshot.time) {
      if (factionOf(hero.owner)?.hero.effect === 'fort') startPlacement('skill', { heroId: hero.id });
      else sendCommand({ type: 'skill', heroId: hero.id });
    }
    return;
  }
  if (action === 'pack') { const camp = selectedEntities().find(entity => entity.type === 'camp' && entity.owner === state.playerId); if (camp) startPlacement('pack', { buildingId: camp.id }); return; }
  if (action === 'focus-selected') { const entities = selectedEntities(); if (entities.length) battlefield.focus(entities.reduce((sum, entity) => sum + entity.x, 0) / entities.length, entities.reduce((sum, entity) => sum + entity.y, 0) / entities.length, entities.length === 1 && entities[0].entityKind === 'city' ? 5 : undefined); }
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action], #cover-begin, #cover-view-map, #cover-return, #settings-toggle');
  const actionsById = { 'cover-begin': 'practice', 'cover-view-map': 'view-map', 'cover-return': 'show-cover', 'settings-toggle': 'settings' };
  if (target && !target.disabled) handleAction(actionsById[target.id] || target.dataset.action, target);
});
document.addEventListener('input', event => {
  if (event.target.id === 'commander-name') { state.name = event.target.value.slice(0, 24); writeStore('name', state.name); }
  if (event.target.id === 'join-code') state.joinCode = event.target.value.slice(0, 12);
  if (event.target.id === 'city-search') { state.citySearch = event.target.value.slice(0, 100); updateCitySearch(); }
  if (event.target.id === 'service-url' && ['settings', 'service'].includes(state.dialog?.type)) state.dialog.serviceDraft = event.target.value;
});
document.addEventListener('change', event => {
  if (event.target.id === 'bot-count') state.botCount = Math.max(1, Math.min(3, number(event.target.value)));
  if (event.target.id === 'city-search-region') { state.citySearchRegion = event.target.value === 'all' || REGION_META.has(event.target.value) ? event.target.value : 'all'; updateCitySearch(); }
  if (event.target.name === 'settings-theme' && event.target.checked) setTheme(event.target.value);
  if (event.target.name === 'settings-mode' && event.target.checked && ['pan', 'select'].includes(event.target.value)) { storeUIPreferences({ mode: event.target.value }); applyUIPreferences(); }
  if (event.target.id === 'settings-wheel' && Object.hasOwn(WHEEL_SPEEDS, event.target.value)) { storeUIPreferences({ wheel: event.target.value }); applyUIPreferences(); }
  if (event.target.id === 'settings-reduced-motion' && !reducedMotionMedia?.matches) { storeUIPreferences({ reducedMotion: event.target.checked }); applyReducedMotion(); }
});
document.addEventListener('toggle', event => {
  if (event.target.id === 'settings-advanced' && state.dialog?.type === 'settings') { state.dialog.advancedOpen = event.target.open; return; }
  if (!event.target.matches?.('details[data-source-city]')) return;
  const cityId = event.target.dataset.sourceCity;
  if (event.target.open) state.sourceExpanded.add(cityId); else state.sourceExpanded.delete(cityId);
}, true);
nodes['action-tabs']?.setAttribute('role', 'tablist');
nodes['action-tabs']?.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('role', 'tab'));
nodes['action-tabs']?.addEventListener('click', event => { const tab = event.target.closest('[data-tab]'); if (tab) { state.tab = tab.dataset.tab; render(); } });
nodes['action-tabs']?.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const tabs = [...nodes['action-tabs'].querySelectorAll('[data-tab]')];
  const current = tabs.indexOf(document.activeElement);
  if (current < 0) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  state.tab = tabs[next].dataset.tab; render(); tabs[next].focus();
});
nodes['language-toggle']?.addEventListener('click', () => setLanguage(lang === 'zh' ? 'en' : 'zh'));
nodes['theme-toggle']?.addEventListener('click', () => setTheme(theme === 'dark' ? 'light' : 'dark'));
nodes['help-toggle']?.addEventListener('click', () => showDialog('help', {}, nodes['help-toggle']));
nodes['home-button']?.addEventListener('click', event => { event.preventDefault(); if (state.mode === 'preview') { state.tab = 'lobby'; handleAction('show-cover', nodes['home-button']); render(); } else showDialog('home', {}, nodes['home-button']); });
nodes['center-view']?.addEventListener('click', () => { const base = ownPlayer()?.base; battlefield.focus(base?.x ?? WORLD.width / 2, base?.y ?? WORLD.height / 2); });
for (const [id, factor] of [['zoom-in', 1.2], ['zoom-out', 1 / 1.2]]) nodes[id]?.addEventListener('click', () => battlefield.zoom(factor));
document.addEventListener('keydown', event => {
  if (event.defaultPrevented) return;
  const inInput = event.target.matches('input, textarea, select, [contenteditable="true"]');
  if (state.dialog) {
    if (event.key === 'Escape' && state.dialog.type !== 'ended') { event.preventDefault(); closeDialog(); return; }
    if (event.key === 'Tab') {
      const focusable = dialogFocusables();
      const first = focusable[0], last = focusable.at(-1);
      if (!focusable.length) { event.preventDefault(); nodes['dialog-layer'].querySelector('.modal')?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || !focusable.includes(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !focusable.includes(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
    return;
  }
  if (inInput || event.altKey) return;
  if (event.key === 'Escape') { cancelPlacement(); state.selected = []; battlefield.setSelection([]); renderSelection(); return; }
  if (/^[1-5]$/.test(event.key)) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      const ids = ownSelectedUnits().map(unit => unit.id);
      if (!ids.length) return toast(t('groupNeedsUnits'));
      state.groups.set(event.key, ids); toast(t('groupSaved', { n: event.key, count: ids.length }));
    } else {
      const ids = (state.groups.get(event.key) || []).filter(id => entityById(id)?.owner === state.playerId);
      if (!ids.length) return toast(t('groupEmpty', { n: event.key }));
      state.selected = ids; battlefield.setSelection(ids); renderSelection();
    }
    return;
  }
  if (event.ctrlKey || event.metaKey || !canPlay()) return;
  if (event.key === 'Home') { event.preventDefault(); const base = ownPlayer()?.base; if (base) battlefield.focus(base.x, base.y); }
  if (event.key.toLowerCase() === 'h') { event.preventDefault(); handleAction('hold', {}); }
  if (event.key.toLowerCase() === 'q') { event.preventDefault(); handleAction('skill', {}); }
  for (const [key, tab] of [['b', 'build'], ['t', 'train'], ['r', 'tech']]) if (event.key.toLowerCase() === key) { state.tab = tab; render(); }
});
window.addEventListener('online', () => { if (state.mode === 'online' && !state.connected) retryConnection(); });
window.addEventListener('beforeunload', () => { if (state.socket) { state.socket.onclose = null; state.socket.close(); } });
window.addEventListener('resize', () => battlefield.resize());
if (reducedMotionMedia?.addEventListener) reducedMotionMedia.addEventListener('change', applyReducedMotion);
else reducedMotionMedia?.addListener?.(applyReducedMotion);
document.addEventListener('visibilitychange', () => { state.lastFrame = performance.now(); });

function animate(now) {
  const dt = Math.max(0, Math.min(0.1, (now - (state.lastFrame || now)) / 1000));
  state.lastFrame = now;
  if (state.mode === 'practice' && state.game && state.snapshot?.status === 'playing') {
    stepGame(state.game, dt);
    driveBots(state.game, state.localBots, dt);
    if (now - state.lastRender > 200) setSnapshot(snapshotFor(state.game, state.playerId));
  }
  if (now - state.lastRender > 200) { render(); state.lastRender = now; }
  if (state.mode === 'online' && state.connected && Date.now() - state.lastPing > 10000) { state.lastPing = Date.now(); sendSocket({ type: 'ping' }); }
  if (state.mode === 'online' && !state.connected && state.reconnectAt && !state.reconnectStopped && Date.now() - state.reconnectAt > 60000) {
    clearTimeout(state.reconnectTimer); state.reconnectStopped = true;
    if (state.socket) { state.socket.onclose = null; state.socket.close(); }
    toast(t('reconnectFailed')); render();
  }
  requestAnimationFrame(animate);
}

applyUIPreferences();
createPreview();
setTheme(theme);
setLanguage(lang);
requestAnimationFrame(animate);
