# automation-3 执行记录：每日采集全球股指日度数据

## 任务要点
- 通过 SSH（`ssh -i griverworld.pem root@120.26.33.18`）在容器内执行：`docker exec griverworld-app node scripts/fetch-indexes.mjs`
- 脚本双通道：tencent（A股指数）+ cnbc（海外指数），自动补采近 3 年，UPSERT 写库
- 数据落盘：/root/opt/griverworld/app/data/indexes.db（挂载卷持久化）
- 判优：8 个指数全 OK 且最新日期为最近交易日即成功；有 FAIL 需重试一次
- 今日结果：12/12 全部 OK，0 失败，无需重试

## 执行历史
| 日期 | 结果 | 备注 |
|------|------|------|
| 2026-08-24 | 成功（12/12 OK） | 无 FAIL；日经/KOSPI 触发实时兜底补齐 |

## 经验
- 产出为数据库写入，无可交付文件，无需调用 deliver_attachments
- 欧美指数最新日期滞后于 A 股/日韩 1 个自然日为正常现象（时区差异，欧美当日盘未收盘）
- 日经225、KOSPI 常触发 CNBC 实时兜底补当日数据，属脚本正常逻辑
