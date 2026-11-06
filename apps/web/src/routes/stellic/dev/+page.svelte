<script lang="ts">
    import { page } from "$app/stores";

    let { form } = $props();
    const returnTo = $derived(
        $page.url.searchParams.get("returnTo") ?? "/recalplus"
    );
</script>

<main class="mx-auto max-w-xl p-6 text-sm text-zinc-900 dark:text-zinc-100">
    <h1 class="mb-1 text-lg font-semibold">Stellic session (dev only)</h1>
    <p class="mb-4 text-zinc-500">
        Stand-in for the real login while it is being built. Log in to Stellic
        in Chrome, then in Proxyman click any <code>stellic.princeton.edu</code> request
        and copy two values from Request → Header. The session lasts about an hour.
    </p>

    {#if form?.message}
        <p class="mb-3 rounded-sm bg-red-100 p-2 text-red-800">
            {form.message}
        </p>
    {/if}

    <form method="POST" class="flex flex-col gap-3">
        <input type="hidden" name="returnTo" value={returnTo} />
        <label class="flex flex-col gap-1">
            <span class="font-medium">Cookie</span>
            <textarea
                name="cookieHeader"
                rows="4"
                required
                autocomplete="off"
                spellcheck="false"
                placeholder="sessionid=...; csrftoken=...; AWSALB=..."
                class="rounded-sm border border-zinc-300 bg-transparent p-2 font-mono text-xs dark:border-zinc-700"
            ></textarea>
        </label>
        <label class="flex flex-col gap-1">
            <span class="font-medium">X-CSRFToken</span>
            <input
                name="csrfToken"
                required
                autocomplete="off"
                spellcheck="false"
                class="rounded-sm border border-zinc-300 bg-transparent p-2 font-mono text-xs dark:border-zinc-700" />
        </label>
        <button
            type="submit"
            class="h-8 rounded-sm bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
            Save session and go back
        </button>
    </form>
</main>
