<script lang="ts">
    import { page } from "$app/stores";
    import { onDestroy } from "svelte";

    // Only send people back to pages on this site.
    const returnTo = $derived.by(() => {
        const r = $page.url.searchParams.get("returnTo") ?? "/recalplus";
        return r.startsWith("/") && !r.startsWith("//") ? r : "/recalplus";
    });

    let step = $state<"credentials" | "duo">("credentials");
    let netid = $state("");
    let password = $state("");
    let busy = $state(false);
    let error = $state("");
    let device = $state("");
    let code = $state<string | null>(null);
    let cancelled = false;

    onDestroy(() => (cancelled = true));

    const post = async (url: string, body?: unknown) => {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        let data: Record<string, unknown> = {};
        try {
            data = await res.json();
        } catch {
            /* non-JSON error page */
        }
        return { ok: res.ok, status: res.status, data };
    };

    const signIn = async (e: SubmitEvent) => {
        e.preventDefault();
        if (busy) return;
        busy = true;
        error = "";
        try {
            const r = await post("/api/client/stellic/login", {
                netid,
                password
            });
            password = ""; // never keep it around in the page
            if (!r.ok) {
                error =
                    r.status === 401
                        ? "Please log in to TigerJunction first."
                        : String(
                              r.data.error ?? "Login failed. Please try again."
                          );
                return;
            }
            device = String(r.data.device ?? "your phone");
            code = typeof r.data.code === "string" ? r.data.code : null;
            step = "duo";
            await waitForApproval();
        } catch {
            error = "Could not reach the server. Please try again.";
        } finally {
            busy = false;
        }
    };

    // The server waits ~20 s per call; keep asking until approved or refused.
    const waitForApproval = async () => {
        const giveUpAt = Date.now() + 3 * 60 * 1000;
        while (!cancelled && Date.now() < giveUpAt) {
            const r = await post("/api/client/stellic/login/finish");
            if (r.ok && r.data.status === "done") {
                const sep = returnTo.includes("?") ? "&" : "?";
                window.location.href = `${returnTo}${sep}stellicExport=1`;
                return;
            }
            if (!r.ok) {
                error = String(r.data.error ?? "Duo login failed.");
                step = "credentials";
                return;
            }
        }
        if (!cancelled) {
            error = "Timed out waiting for Duo. Please try again.";
            step = "credentials";
        }
    };

    const digits = $derived(code ? code.split("").slice(0, 3) : ["", "", ""]);
</script>

<svelte:head>
    <title>Connect Stellic | TigerJunction</title>
</svelte:head>

<main class="page">
    <div class="card">
        <div class="logo" aria-label="TigerJunction">
            <div class="logo-row">
                <span class="tiger">Tiger</span>
                <img src="/tjlogonew.png" alt="" class="logo-img" />
            </div>
            <span class="junction">Junction</span>
        </div>

        {#if step === "credentials"}
            <form class="form" onsubmit={signIn}>
                <p class="hint">
                    Sign in with Princeton to connect your Stellic plan.
                </p>
                <label class="sr-only" for="netid">NetID</label>
                <input
                    id="netid"
                    class="pill"
                    placeholder="NET ID"
                    autocomplete="username"
                    autocapitalize="none"
                    spellcheck="false"
                    required
                    bind:value={netid} />
                <label class="sr-only" for="password">Password</label>
                <input
                    id="password"
                    class="pill"
                    type="password"
                    placeholder="PASSWORD"
                    autocomplete="current-password"
                    required
                    bind:value={password} />

                {#if error}
                    <p class="error" role="alert">{error}</p>
                {/if}

                <div class="divider"></div>
                <button class="login" type="submit" disabled={busy}>
                    {busy ? "SIGNING IN…" : "LOGIN"}
                </button>
                <p class="fine">
                    Your password goes straight to Princeton's login and is
                    never stored.
                </p>
            </form>
        {:else}
            <div class="form">
                <span class="duo-label">DUO CODE</span>
                <div class="boxes" aria-live="polite">
                    {#each digits as d}
                        <div class="box">{d}</div>
                    {/each}
                </div>
                <p class="hint">
                    {#if code}
                        Enter this code in the Duo app on <b>{device}</b>, then
                        approve.
                    {:else}
                        Approve the Duo Push sent to <b>{device}</b>.
                    {/if}
                </p>
                <button class="login" type="button" disabled>
                    WAITING FOR APPROVAL…
                </button>
                <button
                    class="link"
                    type="button"
                    onclick={() => {
                        cancelled = true;
                        window.location.reload();
                    }}>
                    Start over
                </button>
            </div>
        {/if}
    </div>
</main>

<style>
    .page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background:
            radial-gradient(
                40% 45% at 22% 30%,
                rgba(196, 186, 232, 0.55),
                transparent 70%
            ),
            radial-gradient(
                40% 40% at 25% 85%,
                rgba(232, 196, 178, 0.5),
                transparent 70%
            ),
            radial-gradient(
                40% 45% at 88% 65%,
                rgba(176, 200, 236, 0.55),
                transparent 70%
            ),
            #ecebea;
        color: #1f2937;
    }
    .card {
        width: 100%;
        max-width: 420px;
        padding: 40px 48px 48px;
        border-radius: 10px;
        background: rgba(245, 243, 244, 0.85);
        backdrop-filter: blur(6px);
    }
    .logo {
        display: flex;
        flex-direction: column;
        align-items: center;
        line-height: 0.9;
        font-family: "Playfair Display", Georgia, "Times New Roman", serif;
        margin-bottom: 36px;
    }
    .logo-row {
        display: flex;
        align-items: flex-end;
        gap: 2px;
    }
    .logo-img {
        height: 52px;
    }
    .tiger {
        color: #5b82f6;
        font-size: 44px;
        font-weight: 700;
    }
    .junction {
        color: #f28c1b;
        font-size: 44px;
        font-weight: 700;
        font-style: italic;
        margin-left: 16px;
    }
    .form {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .pill {
        height: 56px;
        border: 2px solid #5b82f6;
        border-radius: 9999px;
        padding: 0 28px;
        background: transparent;
        color: #1f2937;
        font-size: 15px;
        outline: none;
    }
    .pill::placeholder {
        color: #5b82f6;
        font-weight: 600;
        font-size: 13px;
        letter-spacing: 0.04em;
    }
    .pill:focus {
        box-shadow: 0 0 0 3px rgba(91, 130, 246, 0.25);
    }
    .divider {
        height: 1px;
        background: rgba(0, 0, 0, 0.1);
        margin: 4px 0;
    }
    .login {
        height: 56px;
        border-radius: 9999px;
        background: #5b82f6;
        color: white;
        font-weight: 600;
        letter-spacing: 0.04em;
        transition: background-color 150ms;
    }
    .login:hover:not(:disabled) {
        background: #4a6fe0;
    }
    .login:disabled {
        opacity: 0.75;
        cursor: wait;
    }
    .duo-label {
        color: #5b82f6;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
    }
    .boxes {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
    }
    .box {
        aspect-ratio: 3 / 4;
        border-radius: 18px;
        background: #dfe0ee;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        font-weight: 700;
        color: #1f2937;
    }
    .hint {
        font-size: 14px;
        color: #4b5563;
        text-align: center;
    }
    .fine {
        font-size: 12px;
        color: #6b7280;
        text-align: center;
    }
    .error {
        font-size: 14px;
        color: #b91c1c;
        text-align: center;
    }
    .link {
        font-size: 13px;
        color: #5b82f6;
        text-decoration: underline;
        align-self: center;
    }
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
    }
</style>
