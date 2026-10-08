# DEMO SCRIPT (P4 owns; P1 records; P2 supplies AWS clips). Target 2:50, hard limit 3:00.

Record AFTER feature freeze. Use a real, deployed URL on a phone viewport + one desktop segment. Captions on.
Only sourced claims. Label every simulation. Show REAL AWS console windows (not just a diagram).

## Scenario (P4 fills in)
- Origin: __ , Destination: __ (default fastest route crosses a CRITICAL underpass)
- Simulator values: 30 -> 60 -> 80 mm/hr
- Report photo: __ (own photo or licensed, credited)
- Ask-AI question: "Why is <zone> dangerous and what should we do?"

| Time | Screen | Voiceover gist |
|---|---|---|
| 0:00-0:20 | Your own photo/footage of a flooded underpass (credited) | "Every monsoon, Delhi's underpasses trap people. They flood in minutes. Nobody warns you before you drive in." |
| 0:20-0:50 | Live map, real forecast, click an underpass | "Aquashield scores waterlogging risk street by street. Not a black box: here's why it's 61." Show factor bars |
| 0:50-1:15 | Rainfall simulator 30 -> 60 -> 80 | "What if rain doubles? Same engine as the backend." Show SIMULATION label |
| 1:15-1:50 | Citizen uploads photo | "3 taps. Amazon Bedrock verifies the photo, rejects fakes, scores trust. Risk jumps." (show old -> new) |
| 1:50-2:15 | Safe route | "The fastest route crosses a critical underpass. Aquashield's route avoids it: +6 minutes." |
| 2:15-2:40 | Ops dashboard + Ask AI | "A Strands agent explains why, drafts an alert in English and Hindi, creates a work order for pump dispatch." |
| 2:40-2:55 | **AWS proof montage** + architecture | "Fully serverless on AWS: Lambda, DynamoDB, S3, Bedrock, EventBridge, SNS. Scales to zero in dry weeks." |
| 2:55 | End card | "Don't react to floods. Predict them." |

## Pre-record checklist
- [ ] Deployed URL loads signed out, on a phone
- [ ] Demo data reset; the one-take path rehearsed twice
- [ ] AWS clips ready: Lambda, DynamoDB items, S3 object, Bedrock call, EventBridge, SNS, Amplify, CloudWatch
- [ ] Video < 3:00, captions, music licensed/none
- [ ] YouTube unlisted/public; link tested signed out
