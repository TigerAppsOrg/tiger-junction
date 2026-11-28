# Stellic Gateway

An internal service that links a student's Stellic account to TigerJunction and keeps that link signed in, so TigerJunction can read from (and later write to) Stellic on the student's behalf.

The student signs in once with their NetID, password and a Duo push. The password is used for that one sign-in and never stored. The gateway keeps only the resulting cookies, encrypted, and renews them in the background for 11 hours. After that the student signs in again.

```
browser ──► web app (/api/client/stellic/*) ──► stellic-gateway ──► CAS / Duo / Stellic
            signed-in user → netid              service key          stored, renewed
                                                                      session (Postgres)
```

The gateway trusts the netid it is given. The web app's routes are what make that safe: they take the netid from the signed-in user's `@princeton.edu` email, never from the browser. Only the web app's server code should call the gateway.

## Run it locally

Prerequisites: [Bun](https://bun.sh/) and Docker.

```sh
cd apps/stellic-gateway
bun install
cp .env.example .env        # defaults work with the Docker database below
bun run docker:up           # Postgres on localhost:5434
bun run db:migrate          # create the tables
```

Then run **both** processes, each in its own terminal:

```sh
bun run dev                 # HTTP server on http://localhost:3100
bun run worker              # keeps stored sessions signed in
```

Without the worker, sessions run out about an hour after sign-in.

To call it from the web app, add to `apps/web/.env`:

```sh
STELLIC_GATEWAY_URL=http://localhost:3100
STELLIC_GATEWAY_TOKEN=dev-change-me   # the gateway's SERVICE_API_KEY
STELLIC_DEV_NETID=yournetid           # optional, see below
```

`STELLIC_DEV_NETID` lets the web app's `/api/client/stellic` routes act as that netid without a Supabase login. It only works under `npm run dev`; production builds ignore it.

## Environment variables

| Variable           | Meaning                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POSTGRES_URL`     | Postgres connection string. The default matches `docker-compose.yml`.                                                                                  |
| `SERVICE_API_KEY`  | Shared secret. Every request except `/health` and `/docs` must send `Authorization: Bearer <key>`.                                                     |
| `SESSION_SEAL_KEY` | 64 hex characters (`openssl rand -hex 32`). Encrypts stored sessions. Changing it makes every stored session unreadable, so everyone has to reconnect. |
| `HTTP_TIMEOUT_MS`  | Timeout for each request to Stellic, CAS and Duo. Default 30000.                                                                                       |
| `PORT`             | HTTP port. Default 3100.                                                                                                                               |
| `STELLIC_DEBUG`    | Set to `1` to log every request to Stellic, CAS and Duo: method, URL without query, status, and cookie **names** (never values).                       |

## Linking a student

Linking takes two calls, because the student has to approve a Duo push in between:

1. **`POST /connect/start`** with `{ netid, password }`. The gateway signs in to CAS and sends the Duo push. It returns a `connectionToken`, plus the `device` the push went to and a `verificationCode` if Duo wants one entered in the app. Show both to the student.
2. **`POST /connect/finish`** with `{ connectionToken, netid }`, repeated until it stops returning `202`. Each call answers within about 5 s:
   - `202 { status: "pending" }`: the push isn't approved yet. Call again after 1–2 s.
   - `200 { netid, status: "active" }`: linked.
   - `410 push_not_approved`: the push expired or was declined. Start over.

   The gateway waits up to 90 s for the push, so keep polling for longer than that (2 min is a good limit). Otherwise the client gives up before the final answer arrives.

A `connectionToken` is only valid for the netid it was issued to, and only for 5 minutes.

## API

Every route except `/health` and `/docs` needs `Authorization: Bearer <SERVICE_API_KEY>`. While the server is running, http://localhost:3100/docs lists the endpoints.

| Method and path               | Body                         | Success                                                                                            |
| ----------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `GET /health`                 |                              | `200 { status: "ok", timestamp }`                                                                  |
| `POST /connect/start`         | `{ netid, password }`        | `200 { connectionToken, device, verificationCode, pushNeeded }`                                    |
| `POST /connect/finish`        | `{ connectionToken, netid }` | `200 { netid, status: "active" }`, or `202` while pending                                          |
| `GET /connect/:netid/status`  |                              | `200 { netid, status, casExpiresAt, stellicExpiresAt, lastRefreshedAt }`, or `404` if never linked |
| `DELETE /connect/:netid`      |                              | `200 { netid, status: "disconnected" }`. Deletes the stored session.                               |
| `GET /actions/:netid/courses` |                              | `200 { netid, courses: [{ code, title, units }] }`, the current semester                           |

In the status response, `status` is `active`, `needs_reconnect` or `disconnected`. `casExpiresAt` is when the link ends (11 h after sign-in), and `stellicExpiresAt` is when the gateway next renews the session.

### Errors

| Status | Body `error`           | Meaning                                                    | What the caller should do                         |
| ------ | ---------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| 400    |                        | Missing fields                                             | Fix the request                                   |
| 401    | `unauthorized`         | Wrong or missing service key                               | Check `STELLIC_GATEWAY_TOKEN`                     |
| 404    |                        | Unknown netid, or unknown/expired `connectionToken`        | Link the student first, or start over             |
| 409    | `needs_reconnect`      | The link has ended: past 11 h, or CAS refused to renew it  | Ask the student to sign in again                  |
| 410    | `push_not_approved`    | The Duo push expired or was declined                       | Start over; `detail` is a message for the student |
| 502    | `stellic_login_failed` | CAS, Duo or Stellic rejected a step, e.g. a wrong password | Show `detail`; it says what failed                |
| 502    | `stellic_unreachable`  | Network error or timeout talking to Stellic, CAS or Duo    | Try again later                                   |

### Web app routes

The web app wraps the gateway for the browser, with the netid taken from the signed-in user:

| Web route                                                    | Calls                                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `GET /api/client/stellic`                                    | `GET /connect/:netid/status`. A never-linked user gets `{ status: "not_connected" }` instead of a 404. |
| `DELETE /api/client/stellic`                                 | `DELETE /connect/:netid`                                                                               |
| `POST /api/client/stellic/start` with `{ password }`         | `POST /connect/start`                                                                                  |
| `POST /api/client/stellic/finish` with `{ connectionToken }` | `POST /connect/finish`                                                                                 |

Statuses and bodies pass through unchanged. The web routes add three of their own: `401` when nobody is signed in, `403` when the signed-in email isn't `netid@princeton.edu`, and `504` when the gateway takes longer than 8 s.

## How sessions stay signed in

There are three time limits:

- **Each Stellic session lasts 1 hour.** Princeton's login server sets that deadline (`SessionNotOnOrAfter` in the SAML response), and Stellic's "Extend Session" button can't move it.
- **CAS renews for 12 hours.** A new Stellic session can be fetched through CAS without the password or Duo, until 12 h after the password sign-in. After that CAS wants the password again.
- **The gateway stops at 11 hours,** an hour before CAS does, as a safety margin.

The worker runs every 60 s and does two things:

1. Connections past their 11 h limit become `needs_reconnect`, and their stored session is deleted.
2. Any other session within 5 minutes of its deadline is replaced with a new one from CAS, which carries a new 1 h deadline. That works out to a renewal about every 55 minutes.

A renewal that fails with a network error or an unexpected answer is retried on the next tick. After 3 failures in a row the worker backs off and retries after 5, 10, 20 and 30 minutes, once each. If the retry after the 30-minute wait fails too (the 7th failure in a row, about 67 minutes after the first), the connection becomes `needs_reconnect` and its stored session is deleted. A success at any point clears the count. A session that lapses during a backoff is still renewed through CAS, and reads renew a lapsed session themselves. The worker logs each failure with its count and the next retry time.

A renewal takes a few seconds. If the student signs in again or disconnects while one runs, its result is thrown away: it never overwrites the newer session or marks it `needs_reconnect`, and its failures don't count toward the new sign-in's backoff.

So any connection marked `active` holds a working session. If a request still finds one lapsed (for example after the worker was down), `currentCourses` renews it once and retries.

## Adding a Stellic action

Read actions follow `currentCourses`:

1. Add the Stellic request as a method on `StellicSession` (`src/stellic/session.ts`). Use `parseStellicJson()` on the response.
2. Add a method to `ConnectionService` (`src/service.ts`) that loads the connection with `loadActive()` and runs the request inside `markIfLapsed()`, so a dead session is marked `needs_reconnect`.
3. Add a route in `src/routes/actions.ts`, and map errors with `handleStellicError()`.

**Writes:** don't copy `currentCourses`' retry. It renews and resends on any `StellicLoginError`, and an unexpected response to a write that Stellic actually applied raises the same error, so a retry can apply the write twice. Decide per write whether resending is safe.

Never log or return a stored session. Besides Stellic's cookies, it holds the student's CAS sign-in cookie, which works for any Princeton CAS service until CAS's 12 h run out.

## Testing

```sh
bun run test                # unit tests, no network or database
bun run lint                # prettier + eslint
bun run format              # fix formatting
```

`src/scripts/manual-login.ts` runs the real flow against your own Stellic account: sign-in, Duo push, a course read, then a CAS renewal (as the worker does) and another course read. It needs no server or database.

```sh
bun src/scripts/manual-login.ts <netid>
```

To exercise the server itself, use `curl`. Read the password with `read -s` so it isn't echoed or saved in your shell history:

```sh
KEY=dev-change-me; NETID=yournetid
read -s PW
jq -n --arg n "$NETID" --arg p "$PW" '{netid: $n, password: $p}' |
  curl -s localhost:3100/connect/start -H "Authorization: Bearer $KEY" \
       -H 'content-type: application/json' -d @-
unset PW
# approve the push, then repeat until it stops answering 202:
curl -s localhost:3100/connect/finish -H "Authorization: Bearer $KEY" \
     -H 'content-type: application/json' \
     -d "{\"connectionToken\": \"<token>\", \"netid\": \"$NETID\"}"
curl -s localhost:3100/actions/$NETID/courses -H "Authorization: Bearer $KEY"
```

## Limits

- **Run one server instance.** Logins waiting on a Duo push are kept in memory, so `/connect/finish` must reach the same process that handled `/connect/start`. The worker can run separately.
- **Restarting the server** cancels any logins waiting on a push; the student starts over. Stored sessions are unaffected.
- **`/connect/start` makes about six requests in a row** to CAS and Duo. If CAS is slow, the web app's 8 s timeout can fire after the push was already sent; the student then has to start over.
- **`/docs` is public.** It only lists endpoints and can't call them without the key. Turn it off or protect it before deploying.
