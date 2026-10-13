import { ASIA_WORLD, ASIA_LAND } from './asia-map.js';

// Shared, dependency-free definitions. All durations are seconds.
export const WORLD = ASIA_WORLD;
export { ASIA_LAND };

export const FACTIONS = {
  qin: {
    id: 'qin', name: '秦', nameEn: 'Qin', color: '#d69a61',
    description: '严整步阵与攻城器械，正面推进。', descriptionEn: 'Disciplined infantry and powerful siege engines.',
    ruler: '嬴政', rulerEn: 'Ying Zheng', feature: '工事建设速度提高20%。', featureEn: 'Fortifications are built 20% faster.',
    modifiers: { fortificationSpeed: 1.2 },
    unique: { name: '盾弩卫队', nameEn: 'Shield Crossbow Guard', description: '持盾弩兵，能稳住远程战线。', descriptionEn: 'Shielded crossbowmen hold a steady ranged line.', stats: { hp: 290, damage: 28, range: 165, speed: 43, attackInterval: 1.5, sight: 210, category: 'archer' } },
    hero: { name: '王翦', nameEn: 'Wang Jian', skillName: '筑垒', skillNameEn: 'Field Fortification', description: '在附近建立持续25秒的临时箭塔。', descriptionEn: 'Builds a temporary watchtower nearby for 25 seconds.', cooldown: 65, effect: 'fort' }
  },
  han: {
    id: 'han', name: '汉', nameEn: 'Han', color: '#e86469',
    description: '稳定粮草与骑兵反击，持续作战。', descriptionEn: 'Reliable supplies and decisive cavalry counterattacks.',
    ruler: '汉武帝', rulerEn: 'Emperor Wu', feature: '补给范围内恢复速度提高25%。', featureEn: 'Recovery near supply points is 25% faster.',
    modifiers: { supplyRecovery: 1.25 },
    unique: { name: '游骑兵', nameEn: 'Raiding Cavalry', description: '快速轻骑，擅长侦察和绕后。', descriptionEn: 'Fast light cavalry excel at scouting and flanking.', stats: { hp: 280, damage: 27, range: 32, speed: 94, attackInterval: 1.2, sight: 245, category: 'cavalry' } },
    hero: { name: '霍去病', nameEn: 'Huo Qubing', skillName: '奔袭', skillNameEn: 'Swift Raid', description: '周围友军视野提高30%，骑兵移速提高35%，持续12秒。', descriptionEn: 'Nearby allies gain 30% sight; cavalry gain 35% speed for 12 seconds.', cooldown: 55, effect: 'raid' }
  },
  tang: {
    id: 'tang', name: '唐', nameEn: 'Tang', color: '#f0bd58',
    description: '精锐骑兵与快速支援，寻找突破口。', descriptionEn: 'Elite cavalry and rapid battlefield support.',
    ruler: '李世民', rulerEn: 'Li Shimin', feature: '步骑相邻作战时攻击提高10%。', featureEn: 'Adjacent infantry and cavalry gain 10% attack.',
    modifiers: { combinedArms: 1.1 },
    unique: { name: '重装骑兵', nameEn: 'Heavy Cavalry', description: '耐打的突击骑兵，需要步兵协同。', descriptionEn: 'Durable shock cavalry benefit from infantry support.', stats: { hp: 410, damage: 31, range: 32, speed: 74, attackInterval: 1.35, sight: 210, category: 'cavalry' } },
    hero: { name: '李靖', nameEn: 'Li Jing', skillName: '协同军令', skillNameEn: 'Combined Command', description: '附近具有两种以上兵种时，友军受到伤害减少25%，持续14秒。', descriptionEn: 'With at least two nearby unit categories, allies take 25% less damage for 14 seconds.', cooldown: 60, effect: 'command' }
  },
  song: {
    id: 'song', name: '宋', nameEn: 'Song', color: '#66c49c',
    description: '商业与远程防线，将经济转为火力。', descriptionEn: 'Trade and ranged defenses turn prosperity into firepower.',
    ruler: '赵匡胤', rulerEn: 'Zhao Kuangyin', feature: '已连通集市的银两收入提高20%。', featureEn: 'Connected market cities provide 20% more silver.',
    modifiers: { marketIncome: 1.2 },
    unique: { name: '强弩兵', nameEn: 'Heavy Crossbowmen', description: '射程较长，移动较慢。', descriptionEn: 'Long-ranged crossbows with limited mobility.', stats: { hp: 190, damage: 33, range: 200, speed: 43, attackInterval: 1.6, sight: 230, category: 'archer' } },
    hero: { name: '岳飞', nameEn: 'Yue Fei', skillName: '整军', skillNameEn: 'Regroup', description: '周围友军逐步恢复生命，受到攻击的编队停止恢复，持续14秒。', descriptionEn: 'Nearby allies gradually recover for 14 seconds; taking a hit interrupts that squad’s recovery.', cooldown: 60, effect: 'regroup' }
  },
  yuan: {
    id: 'yuan', name: '元', nameEn: 'Yuan', color: '#76a7e8',
    description: '骑射与迁移军营，绕开正面防线。', descriptionEn: 'Mounted archers and mobile camps outmaneuver fixed defenses.',
    ruler: '忽必烈', rulerEn: 'Kublai Khan', feature: '可建造并迁移军营，主城固定。', featureEn: 'Can build and relocate a mobile camp; the main citadel remains fixed.',
    modifiers: { mobileCamp: true },
    unique: { name: '骑射兵', nameEn: 'Mounted Archers', description: '能移动射击，但移动时伤害降低25%。', descriptionEn: 'Can fire while moving, with a 25% damage penalty.', stats: { hp: 240, damage: 23, range: 150, speed: 96, attackInterval: 1.35, sight: 230, category: 'cavalry', ranged: true } },
    hero: { name: '速不台', nameEn: 'Subutai', skillName: '迂回', skillNameEn: 'Flanking Maneuver', description: '周围骑射兵移动射击无伤害惩罚，持续14秒。', descriptionEn: 'Nearby mounted archers fire while moving without penalty for 14 seconds.', cooldown: 60, effect: 'flank' }
  },
  ming: {
    id: 'ming', name: '明', nameEn: 'Ming', color: '#bc8de0',
    description: '火器与攻城火力，需要步兵保护。', descriptionEn: 'Gunpowder and siege power protected by infantry screens.',
    ruler: '朱元璋', rulerEn: 'Zhu Yuanzhang', feature: '科技研究速度提高20%。', featureEn: 'Technology research is 20% faster.',
    modifiers: { researchSpeed: 1.2 },
    unique: { name: '火铳兵', nameEn: 'Handgunners', description: '射击间隔较长，需要枪兵掩护。', descriptionEn: 'Powerful but slow-firing handguns need spearmen to screen them.', stats: { hp: 210, damage: 45, range: 185, speed: 42, attackInterval: 2, sight: 215, category: 'archer' } },
    hero: { name: '戚继光', nameEn: 'Qi Jiguang', skillName: '列阵', skillNameEn: 'Disciplined Formation', description: '附近同时有枪兵和火铳兵时，静止编队获得攻击和防御加成，持续14秒。', descriptionEn: 'With spearmen and handgunners nearby, stationary squads gain attack and defense for 14 seconds.', cooldown: 60, effect: 'formation' }
  }
};

export const UNITS = {
  spear: { name: '枪兵', nameEn: 'Spearmen', cost: { food: 60, silver: 30 }, duration: 8, level: 1, building: 'barracks', hp: 250, damage: 22, range: 30, speed: 53, attackInterval: 1.15, sight: 190, category: 'spear' },
  archer: { name: '弓兵', nameEn: 'Archers', cost: { food: 55, silver: 45 }, duration: 9, level: 1, building: 'barracks', hp: 160, damage: 21, range: 160, speed: 50, attackInterval: 1.4, sight: 210, category: 'archer' },
  cavalry: { name: '骑兵', nameEn: 'Cavalry', cost: { food: 85, silver: 80 }, duration: 12, level: 2, building: 'stable', hp: 300, damage: 27, range: 32, speed: 82, attackInterval: 1.3, sight: 220, category: 'cavalry' },
  siege: { name: '攻城车', nameEn: 'Siege Engine', cost: { food: 50, silver: 140 }, duration: 18, level: 3, building: 'arsenal', hp: 330, damage: 68, range: 190, speed: 32, attackInterval: 2.4, sight: 215, category: 'siege' },
  unique: { name: '阵营精锐', nameEn: 'Faction Elite', cost: { food: 105, silver: 110 }, duration: 15, level: 2, building: 'barracks', hp: 300, damage: 30, range: 30, speed: 55, attackInterval: 1.3, sight: 210, category: 'spear' },
  hero: { name: '历史名将', nameEn: 'Historical Commander', cost: { food: 150, silver: 150 }, duration: 20, level: 2, building: 'base', hp: 680, damage: 32, range: 45, speed: 65, attackInterval: 1.2, sight: 260, category: 'hero' }
};

export const BUILDINGS = {
  base: { name: '主城', nameEn: 'Main Citadel', cost: { food: 0, silver: 0 }, duration: 0, level: 1, hp: 2400, limit: 1 },
  farm: { name: '农庄', nameEn: 'Farm', cost: { food: 0, silver: 100 }, duration: 12, level: 1, hp: 500, income: { food: 2.2, silver: 0 }, limit: 3 },
  workshop: { name: '工坊', nameEn: 'Workshop', cost: { food: 0, silver: 140 }, duration: 15, level: 1, hp: 550, income: { food: 0, silver: 1.7 }, limit: 3 },
  barracks: { name: '兵营', nameEn: 'Barracks', cost: { food: 30, silver: 130 }, duration: 16, level: 1, hp: 700, limit: 2 },
  stable: { name: '马厩', nameEn: 'Stable', cost: { food: 80, silver: 180 }, duration: 20, level: 2, hp: 700, limit: 2 },
  arsenal: { name: '器械所', nameEn: 'Arsenal', cost: { food: 100, silver: 220 }, duration: 24, level: 3, hp: 750, limit: 2 },
  housing: { name: '民居', nameEn: 'Housing', cost: { food: 40, silver: 100 }, duration: 12, level: 1, hp: 450, capacity: 4, limit: 3 },
  tower: { name: '箭塔', nameEn: 'Watchtower', cost: { food: 30, silver: 150 }, duration: 18, level: 1, hp: 850, damage: 24, range: 230, attackInterval: 1.25, limit: 6 },
  camp: { name: '移动军营', nameEn: 'Mobile Camp', cost: { food: 100, silver: 180 }, duration: 20, level: 1, hp: 700, faction: 'yuan', limit: 1 }
};

export const BASE_UPGRADES = {
  2: { cost: { food: 260, silver: 340 }, duration: 45 },
  3: { cost: { food: 440, silver: 560 }, duration: 60 }
};

export const TECHS = {
  weapons: { name: '兵器改良', nameEn: 'Improved Weapons', cost: { food: 120, silver: 180 }, duration: 30, level: 2 },
  armor: { name: '甲胄改良', nameEn: 'Improved Armor', cost: { food: 150, silver: 150 }, duration: 30, level: 2 },
  logistics: { name: '后勤整备', nameEn: 'Improved Logistics', cost: { food: 160, silver: 120 }, duration: 25, level: 2 }
};

export const RULES = { maxPlayers: 4, maxSquads: 24, initialCapacity: 12, captureDuration: 20, settleDuration: 45, crownDuration: 120, crownEconomyCities: 3, matchDuration: 2400, heroRespawnDelay: 60, cityRadius: 18, townRadius: 8, townIncome: 0.08, connectionDistance: 500 };
