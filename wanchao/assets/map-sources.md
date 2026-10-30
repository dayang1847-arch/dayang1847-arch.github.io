# 亚洲地图与 500 城池来源 / Asia atlas provenance

地图兼容标记：`map500-ne50-v2`。本地图使用真实地理轮廓与真实地点，资源、城防、港口运输时间及疆域分区为游戏设定。现代地名用于定位；这不表示 500 个地点在每个古代王朝都已存在，或拥有历史上的城墙与港口。

## 原始公开数据

下载日期：2026-10-14。数据来自 Natural Earth 官方维护仓库 [natural-earth-vector](https://github.com/nvkelso/natural-earth-vector)，许可为 [Public Domain](https://www.naturalearthdata.com/about/terms-of-use/)，不需要 API key。

| 用途 | 数据与官网版本 | 下载的 GeoJSON | 源文件 SHA-256 |
| --- | --- | --- | --- |
| 500 个真实地点 | [10m Populated Places](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/)，5.1.2 | [ne_10m_populated_places.geojson](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places.geojson)，7,342 条，19,359,003 字节 | `9b8e3de09048ef00dfc70357dbb9fa324493f214b5e0ae4daf1aa79a8d10116b` |
| 海岸与陆地导航 | [50m Physical Vectors / Land](https://www.naturalearthdata.com/downloads/50m-physical-vectors/)，4.0.0 | [ne_50m_land.geojson](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson)，1,420 条，1,636,166 字节 | `e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b` |
| 日本群岛及朝鲜半岛分区轮廓 | [50m Admin 0 Countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/)，5.1.1 | [ne_50m_admin_0_countries.geojson](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson)，242 条，3,083,490 字节 | `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb` |

以上版本号来自官网数据发布说明；哈希固定本次实际下载的内容，避免仓库分支未来更新影响复核。

## 500 城的筛选与名称

`assets/asia-cities.js` 导出恰好 500 条可占领城池。每条均保留源 `NE_ID` 为 `sourceId`、原始点坐标 `lon/lat`、`NAME` 为 `sourceName`、`NAME_EN` 为 `sourceNameEn`、`NAME_ZH` 为 `nameZhSource`，以及源国家代码、Wikidata ID、人口和标签层级。

筛选使用以下 `ADM0_A3`：AFG ARM AZE BHR BGD BTN BRN KHM CHN CYP GEO IND IDN IRN IRQ ISR JPN JOR KAZ KWT KGZ LAO LBN MYS MNG MMR NPL PRK OMN PAK PSE PHL QAT SAU SGP KOR LKA SYR TWN TJK THA TLS TUR TKM ARE UZB VNM YEM RUS HKG MAC MDV。地点必须在经度 25–180、纬度 −12–80 的视窗内；俄罗斯地点要求经度 ≥60；土耳其剔除经度 <29.5 且纬度 >40.4 的色雷斯地点。

按源 ID、非空 Wikidata ID、同国家近似同名且相距不超过 0.2 度的重复地点去重。先保留真实战略中心、指定真实海港、各来源国家至少一个候选，再按 `POP_MAX` 降序、`NE_ID` 排序补足 500。经筛选去重后的 2,079 个候选最终覆盖 51 个来源国家代码。城池坐标没有为了玩法而改写。

中文显示使用原始 `NAME_ZH`；本批 500 条全部有该字段。两对真实同名地点以真实国家消歧：北海（中国）/北海（马来西亚），希拉（沙特阿拉伯）/希拉（伊拉克）。英文显示：只有 `NAME_EN` 与 `NAME` 归一化后相同，或编辑距离不超过 1 时采用 `NAME_EN`，否则保留 `NAME`。因此沈阳显示 Shenyang、西安显示 Xi'an，印度 Cuttack 不会采用源中错误的 Pochinki 译名。原始字段仍可审计与检索；全部显示地名及源 ID 各有 500 个唯一值。

| 战略 ID | 实际地点 | 游戏角色 | 地区 |
| --- | --- | --- | --- |
| capital | 洛阳 / Luoyang | 王都 | 中原 |
| city-1 | 西安 / Xi'an | 粮食 | 关陇 |
| city-2 | 沈阳 / Shenyang | 粮食 | 辽东 |
| city-3 | 成都 / Chengdu | 粮食 | 巴蜀 |
| city-4 | 巴特那 / Patna | 粮食 | 南亚 |
| city-5 | 乌鲁木齐 / Urumqi | 银两 | 西域 |
| city-6 | 撒马尔罕 / Samarkand | 银两 | 河中 |
| city-7 | 德黑兰 / Tehran | 银两 | 西亚 |
| city-8 | 上海 / Shanghai | 银两 | 江南 |
| city-9 | 广州 / Guangzhou | 补给要塞 | 岭南 |
| city-10 | 乌兰巴托 / Ulaanbaatar | 补给要塞 | 草原 |
| city-11 | 克拉斯诺亚尔斯克 / Krasnoyarsk | 补给要塞 | 西伯利亚 |
| city-12 | 曼谷 / Bangkok | 补给要塞 | 中南 |
| city-13 | 吉隆坡 / Kuala Lumpur | 补给要塞 | 南洋 |

其余 486 座为 `town`，有少量游戏收入。东京 `ne-1159151609`、首尔 `ne-1159151523` 同时作为东瀛/海东的地理控制参考，仍为 town，不增加经济城数量。

## 真实轮廓与游戏疆域

地图为 1600×1000、边距 40 的等距经纬度投影：`x=40+(lon−25)×1520/155`，`y=40+(80−lat)×10`。裁切 50m 原始陆地生成 539 个闭合环、18,312 个顶点，包括海岛；保留原始海岸，不用手绘大致亚洲替代。欧洲与非洲邻近部分只作背景，不纳入城市筛选。

原 14 战略分区：西域、关陇、中原、江南、巴蜀、岭南、辽东、草原、西伯利亚、河中、西亚、南亚、中南、南洋。由地理锚点的 Voronoi 半平面交集构成互不重叠近似分区，再以真实陆地裁切。新增东瀛、海东，分别使用 50m 日本国土 34 个多岛环与两韩合计 13 个环作地理轮廓；城市按源 JPN/KOR/PRK 归区。旧 14 分区使用 `excludePolygons` 剔除这些轮廓，避免把东京归入辽东，或鹿儿岛归入江南。

16 个地区只是游戏地理分区，不是史实行政边界、某一朝代版图或现代政治主张。`polygon` 保留主环兼容；`polygons` 表示多岛轮廓；`excludePolygons` 表示地理裁切差集。

## 陆地导航、城池落点与航线

导航使用 8 px 基础格网和真实海岸顶点、沿岸与城市附加节点：43,431 个节点，28,824 个可走节点，537 个陆地分量；有城池的分量为 34 个。所有 500 城都有有效 `navNode` 与 `component`，并通过陆路和港口网络可到达。邻接边对真实海岸连续求交，不能靠粗采样跨过狭窄海峡。人工山林障碍也从城池落点与可走边中排除。

`x/y` 供地名渲染，始终由源 `lon/lat` 投影。沿海地点若在简化海岸外，`navX/navY` 吸附到最近真实陆地导航位置，不扩张海岸；`navOffset` 公布差异。本批最大偏移 0.370 px。海岸停靠位置为 `dockX/dockY`，离岸水面位置为 `seaX/seaY`；`dockOffset` 保留城市导航位置与停靠点距离。

61 个真实沿海城市指定为可用港口；这是玩法港口标记，不是 Natural Earth 港口设施清单。60 条稀疏双向航线把全部 61 港连成一个海运图，含日本、台湾、菲律宾、印度尼西亚、斯里兰卡和其他有城岛屿。海域内路线来自 8 px 海面格网及 2 px 沿岸格网，每条海段对海岸求交验证，不能穿岛。37 条显示用陆路也逐段核验在陆地上；946 条稀疏补给邻接边只连接同陆地分量的城池，实际行军仍由陆地导航裁决。

50m 陆地的苏伊士地峡将地中海与印度洋分开。为避免把现代运河冒充古代陆桥，增加 Cyprus Limassol → Malé 的地中海远洋航线，经直布罗陀和非洲好望角暂时离开亚洲视窗。其 29 个开放海段用未裁切的全球 50m 陆地源连续求交验证；`offMap:true` 标记这一段地图外航行。地图外只允许既定运输路径，玩家不能在地图外建造或控制陆军。任意一个已控港口均可通达整个海运网络。

`shippingLanes` 字段为 `{fromId,toId,path,duration,seaStart,seaEnd}`；`path` 含港口上下船段，`seaStart..seaEnd` 标注纯海段。`duration` 是压缩后的游戏秒数，并非真实古代航程记录。港口与路线不重建特定朝代的贸易史；运输不引入海战。

## English summary

The atlas contains exactly 500 real places from Natural Earth 10m Populated Places, retaining original IDs, names and geographic coordinates. Natural Earth 50m Land supplies the actual mainland and island coastlines. All data are public domain. Sixteen approximate geographic gameplay regions are clipped to land; Japanese islands and the Korean peninsula have their own geographic regions. These regions, economic roles, fortifications and voyage durations are gameplay abstractions, not historical administrative boundaries or claims that every modern place existed during every dynasty.

Every city has a reachable land navigation node. Sixty bidirectional shipping lanes connect 61 actual coastal cities and every inhabited land component. An audited route around the Cape of Good Hope connects the Mediterranean with the Indian Ocean outside the Asia viewport, avoiding an invented passage through the Suez isthmus. Original source names remain available for audit even where displayed labels use conservative spelling corrections or country qualifiers.
