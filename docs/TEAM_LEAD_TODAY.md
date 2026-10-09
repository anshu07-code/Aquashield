# TEAM LEAD — TODAY (Thursday Oct 8) step by step

Goal for today: **repo live, contract merged, AWS ready, stub API deployed, every person building their own piece.**
The deadline hour is not published yet. Check https://www.wemakedevs.org/aws/env/schedule and Discord every few hours.

## Your GitHub question
- The rules require a WeMakeDevs account and a verified AWS Builder Center profile for EACH member. They do **not**
  require a particular GitHub account. Everyone uses **their own** GitHub account.
- Create the repo under YOUR account (or a free GitHub org), make it **public**, add the other 3 as collaborators.
- Each member must set `git config user.email` to an email linked to their GitHub so commits show their face.
- The repo must be NEW (created today). Don't fork/reuse an old project. Commit history must match Oct 8-11.
- Check the submission form on the hackathon page for any GitHub field before Sunday.

## Name
**Aquashield** — chosen by the team. Use it consistently everywhere: GitHub repo name, README, UI header,
package names, demo video, and the submission form. Do not mix old names in.

---
## STEP 1 — Repo (first 20 min, you)
1. Create public repo `aquashield` on GitHub (empty, add README off).
2. Unzip the starter kit, then:
   ```bash
   cd aquashield
   git init && git add . && git commit -m "chore: initial scaffold, contract, mocks, docs"
   git branch -M main
   git remote add origin https://github.com/<you>/aquashield.git
   git push -u origin main
   ```
3. Invite P1, P3, P4 (Settings -> Collaborators). Everyone clones and runs `npm install && npm test`.
4. Optional: Settings -> Branches -> protect `main` (require PR, require CI). If it slows you down, skip it
   but keep "small PRs + CI" as team rule.
5. Create a WhatsApp/Discord group for the team + a call link.

## STEP 2 — AWS account (20-40 min, you + P2)
1. Create the AWS account at the free tier link from the hackathon page (up to $200 credits; debit/RuPay works).
2. Sign in as root ONCE: enable MFA, then create an admin IAM user for yourself and stop using root.
3. **AWS Budgets:** create alerts at $5, $20, $50 (email you).
4. **Create IAM users** (MFA on) for P2 (admin), P3 (Bedrock + S3 + Lambda + CloudWatch access), P1/P4 (read-only + console).
   Only P2 deploys the shared stack; others call the deployed URL.
5. Pick a region. Check in the Bedrock console which Claude models are available/enabled there. NOTE (Oct 9, 2026): this
   hackathon account is region-locked to Sydney (ap-southeast-2) — all resources must be created there, and the SCP blocks
   Mumbai writes. Verified Claude multi-modal availability in ap-southeast-2 before choosing.
6. **Request Bedrock model access NOW** (P3 or P2). Approval can lag. Record the model ID in the private chat, not in git.
7. Builder Center: each member confirms student verification status (SheerID). It is needed for rewards and the
   Amazon fast-track check.
8. Fill the $25 credit form (leader only) only AFTER the $200 is used.

## STEP 3 — Kickoff call (30 min, everyone)
- Confirm roles (P1 Frontend, P2 Cloud, P3 AI, P4 Data/Risk). If someone is stronger elsewhere, swap now.
- Skim `AGENTS.md` and `docs/CONTRACT.md` together. Anyone with a concern raises it NOW; after this, the contract changes only by PR.
- Agree: small PRs, merge 2-3x/day, announce contract changes, update `STATUS.md`.
- Everyone opens their role file and starts their AI session with: "Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md and docs/roles/<mine>.md first."

## STEP 4 — Today's build targets (per person, see role files for detail)
| Person | By tonight |
|---|---|
| P1 | Next.js app in `apps/web`, map renders mock zones (`NEXT_PUBLIC_USE_MOCKS=true`), click opens detail panel with factor bars, tier colours |
| P2 | SAM stack deployed with `/health` and `/zones` (stub from `mocks/zones.json`), DynamoDB tables, S3 bucket, presign endpoint; give everyone the base URL |
| P3 | One Bedrock multimodal call working from Lambda on 3 test images; vision JSON validates against `VisionAnalysisSchema` |
| P4 | `data/zones.geojson` v0 with 10-15 real Delhi zones + attributes; risk-core already written (tested); simulator math confirmed |

## STEP 5 — Evening sync (15 min, ~3-4 h after kickoff, then again at night)
- Each person shows their piece working. Update `STATUS.md`.
- Tick milestones M0-M2 in `STATUS.md`. Anything red becomes tomorrow's first task.
- Take a quick screenshot of progress (useful for README and blog).

## STEP 6 — Before you sleep
- [ ] Repo public, 4 contributors, first commits pushed today
- [ ] Deployed URL exists (even if stub)
- [ ] Bedrock access confirmed or pending with owner named
- [ ] Tomorrow's first-task list written in `STATUS.md`
- [ ] Everyone's Builder Center verification started

## "What if we start today and push by tomorrow?"
That is the right plan. **Push code constantly (many times per day); submit once, on Sunday morning.**
Target: all P0 features working on the deployed URL by **Friday night**. Saturday is polish, mentor feedback and
rehearsal; Sunday morning is video + submit. Don't submit early without a recorded video; the submission needs the video,
repo and writeup together, and the form closes at the deadline (hour not yet announced).
