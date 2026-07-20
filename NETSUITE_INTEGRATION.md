# NetSuite Integration — SuiteTalk REST (NetSuite Standard API)

How Partner OS connects to NetSuite using the **standard NetSuite API** (SuiteTalk
REST). This is research + a ready-to-wire scaffold. It stays inert until you supply
credentials, so it is safe to ship as-is.

---

## 1. Which NetSuite API

NetSuite exposes several APIs. For a server-to-server integration like Partner OS, the
right one is **SuiteTalk REST** (`.../services/rest`), NetSuite's standard modern API:

| API | Use it? | Notes |
|-----|---------|-------|
| **REST Record Service** (`/record/v1/...`) | ✅ writes + single-record reads | CRUD on standard + custom records |
| **SuiteQL** (`/query/v1/suiteql`) | ✅ list/reporting reads | SQL over the record model; fastest for pulling lists |
| SOAP SuiteTalk | ❌ legacy | Verbose XML; only for records REST doesn't cover |
| RESTlets | ⚠️ only if custom | SuiteScript you deploy; needed for bespoke logic |

Partner OS uses **SuiteQL for pulls** (customers, opportunities) and **REST Record for
pushes** (creating/updating records back in NetSuite).

---

## 2. Authentication

Two supported machine-to-machine options. The scaffold implements **TBA** because it
needs no certificate upload and no external library.

### Option A — Token-Based Auth (TBA / OAuth 1.0a)  ← implemented

Self-contained HMAC-SHA256 signing. You need **4 secrets** + the account id.

Setup in NetSuite:
1. **Enable features**: Setup → Company → Enable Features → SuiteCloud → check
   *SuiteTalk (SOAP & REST Web Services)* and *Token-Based Authentication*.
2. **Integration record** (gives Consumer Key/Secret): Setup → Integration → Manage
   Integrations → New. Uncheck TBA "Authorization Code Grant", check *Token-Based
   Authentication*. Save → copy **Consumer Key** + **Consumer Secret** (shown once).
3. **Role**: create/assign a role with "REST Web Services" + "Log in using Access
   Tokens" permissions and access to the records you sync (Customers, etc.).
4. **Access token** (gives Token Id/Secret): Setup → Users/Roles → Access Tokens → New
   → pick the integration + user + role → copy **Token Id** + **Token Secret** (once).

Env vars the scaffold reads (`server/netsuite/client.ts` → `readConfig()`):
```
NETSUITE_ACCOUNT_ID=1234567          # or 1234567_SB1 for a sandbox
NETSUITE_CONSUMER_KEY=...
NETSUITE_CONSUMER_SECRET=...
NETSUITE_TOKEN_ID=...
NETSUITE_TOKEN_SECRET=...
```
Host is derived: `1234567` → `1234567.suitetalk.api.netsuite.com`; `1234567_SB1` →
`1234567-sb1.suitetalk.api.netsuite.com`. Realm in the OAuth header is the account id
**uppercased**.

### Option B — OAuth 2.0 Machine-to-Machine (client credentials + JWT)

More setup, no per-request signing. You generate an RSA/EC key pair, upload the
**certificate** to a client-credentials mapping in NetSuite, then POST a signed JWT
(`client_assertion`) to
`https://<acct>.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token` to get a
~1h bearer token. Prefer this if your security policy forbids long-lived shared secrets.
To switch, add a `getBearer()` that caches the token and send `Authorization: Bearer` in
`suiteTalk()` instead of the OAuth1 header.

---

## 3. Record mapping

| NetSuite standard record | Partner OS entity | Table | Status |
|--------------------------|-------------------|-------|--------|
| `customer` | Account / customer | `accounts` | ✅ preview + sync implemented |
| `opportunity` / `estimate` | Deal | `deals` | 🔜 mapping defined, sync TODO |
| `job` (Project) | Service project | `projects` | 🔜 |
| `employee` | User | `users` | 🔜 |

Every synced row carries `data->>'nsId'` (the NetSuite internal id) as the correlation
key, so re-syncs **upsert** instead of duplicating.

---

## 4. Endpoints (already wired, guarded)

Mounted at `/api/netsuite` (`server/api/netsuite.ts`):

- `GET /api/netsuite/status` → `{ configured, account, auth, capabilities }`. Works
  without credentials (reports `configured:false`).
- `GET /api/netsuite/customers/preview?limit=25` → read-only SuiteQL pull, no writes.
- `POST /api/netsuite/customers/sync` → pulls active customers and upserts them into
  `accounts` by `nsId`. Returns `{ pulled, inserted, updated }`.

When unconfigured, the two data routes return `503 { error: "NetSuite not configured" }`.

---

## 5. Governance / production notes

- **Rate limits**: SuiteTalk REST is governed by concurrency (per-integration limit,
  commonly 5–15 concurrent). Do syncs sequentially or with a small pool; the scaffold is
  sequential. Back off on HTTP 429.
- **Paging**: SuiteQL returns `hasMore` + `totalResults`; page with `offset`/`limit`
  (max 1000). Extend `customers/sync` to loop while `hasMore` for full datasets.
- **Deltas**: for incremental sync, filter SuiteQL on `lastModifiedDate` and store a
  watermark (an `app_state` doc, e.g. `/api/state/netsuite-sync`).
- **Determinism**: all NetSuite calls happen in the API layer, never inside a render
  path; the app runs identically with NetSuite off.
- **Write-back**: to push a Partner OS change to NetSuite, `POST/PATCH
  /record/v1/customer/{nsId}` via `suiteTalk()` — add routes as needed once read sync is
  validated against a sandbox.

---

## 6. Try it once you have a sandbox

```bash
# unconfigured — safe, returns configured:false
curl https://partner-os-app.onrender.com/api/netsuite/status

# after setting the 5 env vars on the Render service and redeploying:
curl https://partner-os-app.onrender.com/api/netsuite/customers/preview?limit=5
curl -X POST https://partner-os-app.onrender.com/api/netsuite/customers/sync
```
Set the env vars in Render → the `partner-os-app` service → Environment, then redeploy.
