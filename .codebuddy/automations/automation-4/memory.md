# automation-4 执行记录：每日采集全球汇率数据

## 任务要点
- 执行：通过 SSH（`ssh -i /Users/huchenchuan/griverworld/griverworld.pem -o StrictHostKeyChecking=no root@120.26.33.18`）在容器内执行：`docker exec griverworld-app node scripts/fetch-fx.mjs`
- 数据源：ECB 参考汇率（每个工作日更新，周末无新数据）
- 采集 6 个货币对日度收盘：USDCNY 人民币 / USDEUR 欧元 / USDGBP 英镑 / USDHKD 港币 / USDJPY 日元 / USDKRW 韩元
- 数据落盘：/root/opt/griverworld/app/data/fx.db（docker-compose 挂载卷持久化）
- 脚本自动补采近 3 年数据（UPSERT 幂等，无需清库，重复执行安全）
- 判优：6 个货币对全部 OK 且最新日期为最近工作日即成功；有 FAIL 需重试一次（脚本自带 fetch 重试与 curl 兜底）
- 调度：每天 18:00（rrule: FREQ=DAILY;BYHOUR=18;BYMINUTE=0）
- 创建时间：2026-09-01 23:48（automation_update 返回内容被截断，已通过 automations.db 数据库确认创建成功、状态 ACTIVE）

## 执行历史
| 日期 | 结果 | 备注 |
|------|------|------|
| （暂无） | 首次执行预计 2026-09-02 18:00 | — |

## 经验
- 产出为数据库写入，无可交付文件，无需调用 deliver_attachments
- 汇率为日频数据，周末/节假日无新数据，最新日期停在最近工作日属正常，不要误报异常
- ECB 参考汇率通常在北京时间 16:00 左右发布，18:00 调度可覆盖当日数据
