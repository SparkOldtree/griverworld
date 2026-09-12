# automation-2 执行记录：宏观指标数据月度更新

## 任务要点
- 执行：`cd /Users/huchenchuan/griverworld && node scripts/fetch-indicators.mjs --verbose`
- 数据源：东方财富数据中心（中国报表 + 美国指标库）+ FRED（US_10Y DGS10）+ 东财行情 K 线（CN_10Y）
- 25 项指标（中国 13 + 美国 12），其中 3 项 pending（CN_SF 社融 / US_INDUSTRIAL 工业产出 / US_JOBLESS 初请失业金，数据源待接入）
- 写库：data/indicators.db（node:sqlite，UPSERT 幂等，重复执行安全）
- 判定：22 项 OK 为正常，3 项 pending 属预期；中国 10Y 偶发失败属预期（脚本已内置 fetch 重试 + curl 兜底）

## 执行历史
| 日期 | 结果 | 备注 |
|------|------|------|
| 2026-08-25 | 成功（22 OK / 3 PEND / 0 FAIL） | 全部 active 指标采集成功，无失败项；US_RETAIL、US_TRADE 最新数据期 2026-06（85 天）超过 60 天，东财美国库未见 7 月数据，已提醒人工检查；CN_GDP/US_GDP 为季度数据（2026Q2），数据期=季度末，60 天+ 属正常发布节奏 |
| 2026-09-10 | 成功（22 OK / 3 PEND / 0 FAIL） | 用户指定采集中国 8 月 CPI/PPI，均已获取（CPI 0.8%、PPI 3.8%）；本次共 10 项刷新（CN_CPI/PPI/PMI/EXPORT 至 2026-08，CN_10Y/US_10Y 至 2026-09，US_UNEMP/NONFARM/ISM 至 2026-08，US_TRADE 补齐至 2026-07）；US_RETAIL 仍停留 2026-06（101 天），连续两次未更新，已第二次提醒人工检查 |
| 2026-09-10 | 线上同步完成 | 容器内执行采集：首次 21 OK / 1 FAIL（US_10Y FRED 抖动），重跑 20 OK / 2 FAIL（US_10Y + CN_10Y 抖动）；US_10Y 改由本地导出 JSON → scp → 容器内 node UPSERT 补齐（777 期，2026-09=4.8）；线上 API 验证通过，22 项与本地完全一致 |

## 线上部署与同步
- 服务器：`root@120.26.33.18`，密钥 `/Users/huchenchuan/griverworld/griverworld.pem`（工作区内，已被 .gitignore 忽略）
- 项目路径 `/root/opt/griverworld/app`，容器 `griverworld-app`（另有 griverworld-nginx / griverworld-postgres / griverworld-umami）
- 数据落盘：宿主机 `data/` 挂载至容器 `/app/data`（持久化）；`scripts/` 与 `src/` 也挂载，改代码无需重建镜像
- 线上脚本与本地哈希一致（fetch-indicators.mjs / meta.ts / db.ts），可直接在容器内运行采集
- 容器内 Node v24.20.0，**无 curl**（故 fetchKline 的 curl 兜底在线上不可用，CN_10Y 失败时无兜底手段）
- 网站域名 `griver.world` / `www.griver.world`；验证方式 `curl https://griver.world/api/indicators`（无需重启容器，写入后立即生效）

## 经验
- 产出为数据库写入，无可交付文件，无需调用 deliver_attachments
- 美国月度指标（零售/贸易）东财库更新可能滞后数周，若 report_date 超 60 天需在总结中提醒人工检查
- 季度指标（CN_GDP/US_GDP）最新数据期固定为季度末月份，60 天+ 属正常，不要误报异常
- 中国 10Y 依赖东财行情接口，偶发不可达属预期，网络恢复后自动补采
- 月初（9/10 前后）采集时，中国 8 月工业增加值/社零/固投/M2 与美国 8 月 CPI/PPI 仍停留 7 月属正常（发布期在 9 月中旬），不必视为异常
- 东财库对不同美国指标更新速度不一：ISM/失业率/非农较快（月初即有上月值），零售/贸易偏慢（滞后约 1 个月）
- 线上 US_10Y（FRED）网络抖动明显：脚本两次采集均失败，但容器内单独测试 FRED 返回 200；`fetchFred` 无重试逻辑（对比 `fetchKline` 有 3 次重试 + curl 兜底），建议后续为 fred 类型补充重试
- 采集失败不会清空已有数据（脚本遇错即 continue，不写库），失败项保留上次成功值，故线上重跑安全
- 线上补单项数据的可靠方法：本地导出 JSON → scp 至 `data/` 目录 → 容器内 node 用 UPSERT 写入（不 clear，避免空窗，无需重启容器）
- 宿主机无 node，解析 JSON 需在本地或容器内进行
