# @openpcb/cloud-client

Typed client SDK for the **OpenPCB Cloud API**. Wraps:

- **Supabase auth** over a consumer-supplied `SupabaseClient` (the consumer owns
  session storage + PKCE config — works in the browser and on desktop), and
- a **bearer-fetch JSON client** for `cloud-api` (`/v1`), throwing a typed
  `CloudApiError` (RFC-7807 `ProblemDetails`) on non-2xx.

Wire types are reused from [`@openpcb/contracts`](../contracts).

```ts
import { createClient } from "@supabase/supabase-js";
import { createCloudClient } from "@openpcb/cloud-client";

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { flowType: "pkce", persistSession: true },
});
const cloud = createCloudClient({
  apiUrl: "https://api.openpcb.app",
  supabase,
});

await cloud.auth.signIn(email, password);
const me = await cloud.me.get();
const designs = await cloud.designs.listPersonal();
```

## Surface (v0.1.0)

- `auth` — `signIn` · `signOut` · `getSession` · `onAuthStateChange` ·
  `acceptInvite` · `tier`
- `me` — `get`
- `designs` — `personalWorkspace` · `listPersonal` · `listInWorkspace` · `get` ·
  `getProjection` · `create`
- `http` — low-level escape hatch

`comments`, `shares`, `library`, and `realtime` domains land in later phases.

## Develop

```bash
npm run build        # tsc -p tsconfig.build.json → dist/
npm run dev          # watch
npm test             # bun test
```

`@supabase/supabase-js` is a **peer** dependency (the consumer provides it).
