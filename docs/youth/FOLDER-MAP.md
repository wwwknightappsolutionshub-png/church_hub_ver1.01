# Youth module folder map (Phase 1)

```
apps/api/src/modules/youth/
├── index.ts                 # Public barrel
├── youth.module.ts          # Aggregates feature modules + legacy controller
├── youth.controller.ts      # Legacy routes (unchanged until Phase 2 split)
├── youth.service.ts         # Legacy monolith (unchanged until Phase 2 split)
├── youth.constants.ts
├── common/
│   ├── index.ts
│   ├── moderation.util.ts   # EXISTS — shared moderation + feed math
│   └── youth-common.module.ts
├── feed/
│   ├── index.ts
│   ├── feed.module.ts
│   └── feed.service.ts      # Phase 2
├── chat/
│   ├── index.ts
│   ├── chat.module.ts
│   └── chat.service.ts      # Phase 2
├── events/
│   ├── index.ts
│   ├── events.module.ts
│   └── events.service.ts    # Phase 2
├── clips/
│   ├── index.ts
│   ├── clips.module.ts
│   └── clips.service.ts     # Phase 2
├── gamification/
│   ├── index.ts
│   ├── gamification.module.ts
│   └── gamification.service.ts
├── qa/
│   ├── index.ts
│   ├── qa.module.ts
│   └── qa.service.ts
└── prayer/
    ├── index.ts
    ├── prayer.module.ts
    └── prayer.service.ts

apps/web/
├── app/dashboard/youth/
│   ├── layout.tsx           # Phase 1 shell
│   ├── page.tsx             # Existing tab UI (unchanged)
│   ├── feed/page.tsx        # Placeholder route
│   ├── chat/page.tsx
│   ├── events/page.tsx
│   ├── clips/page.tsx
│   ├── gamification/page.tsx
│   ├── qa/page.tsx
│   └── prayer/page.tsx
├── components/youth/
│   ├── index.ts
│   ├── legacy/              # Phase 2 — migrate existing *Panel.tsx here
│   ├── common/index.ts
│   ├── feed/index.ts
│   ├── chat/index.ts
│   ├── events/index.ts
│   ├── clips/index.ts
│   ├── gamification/index.ts
│   ├── qa/index.ts
│   └── prayer/index.ts
└── lib/youth/
    ├── index.ts             # Re-exports + Phase 2 tab constants
    └── routes.ts            # Route path constants

packages/shared-types/src/youth/
└── index.ts                 # DTO stubs Phase 2
```
