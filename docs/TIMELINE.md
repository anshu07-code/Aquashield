# TIMELINE (deadline hour is unpublished -> be conservative; check the Schedule page and Discord)

| When | Goal | Checkpoint (run demo path on the DEPLOYED URL) |
|---|---|---|
| **Thu Oct 8 (today)** | Repo, contract, AWS, stub API, mock map on live URL | M0-M2 |
| **Fri Oct 9** | All P0 features working on the deployed URL | M3 midday, **M4 night** |
| **Sat Oct 10** | P1 features, polish, mentor feedback (DTU optional), **freeze 6 PM**, rehearse, first video take | M5 |
| **Sun Oct 11** | Final video, README, blog, **submit in the morning** | M6, M7 |

## Thursday detail
- 0:00-1:00 Hour-0 admin (docs/TEAM_LEAD_TODAY.md) + contract confirmed
- 1:00-4:00 P2 stub API deployed · P1 mock map · P4 zones v0 (10-15) · P3 first Bedrock call
- Evening sync: show each piece working, update STATUS.md

## Friday detail (full build day)
- Morning: P2 ingest pipeline live; P4 zones expanded; P1 simulator + detail panel; P3 vision module
- Midday: **report flow end to end** (photo -> S3 -> Bedrock -> risk change); P4 route module; P3 agent tools
- Afternoon: P1 route UI + agent UI; P2 security, CloudWatch; integrate on the deployed URL
- Night: **all P0 working** (ugly is fine). Write the list of Saturday fixes.

## Saturday detail
- Morning: P1 ops dashboard, trust badge, EN/HI; P3 eval set + agent polish; P2 AWS proof clips + diagram
- DTU (optional, if you got a seat): show your build to mentors/Amazon team, fix what they criticise
- 6 PM FEATURE FREEZE (bug-fix only)
- Night: rehearse the demo twice, record a first take, P3 starts the blog draft

## Sunday detail
- Morning: final recording/edit -> YouTube (unlisted) -> open the link signed out
- README complete, screenshots, architecture diagram, writeup, blog published on Builder Center
- Submit once, early, on the hackathon's own form

## Cut list (if behind, cut in this order)
1. Backtest, Polly, CloudWatch polish  2. Ops work-order board (keep plan card)  3. Trust-score fancy parts (keep vision + simple trust)
4. Amazon Location Service (use OSRM)  5. Hindi (keep English)  **Never cut:** map, risk engine, simulator, report+vision, route, agent, AWS deploy.
