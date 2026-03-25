<script lang="ts">
    type StreamEvent = {
        event: string;
        data: Record<string, any>;
    };

    let prompt = "";
    let loading = false;
    let responseText = "";
    let streamEvents: StreamEvent[] = [];
    let errorMessage = "";

    const appendEvent = (event: string, data: Record<string, any>) => {
        streamEvents = [...streamEvents, { event, data }];
    };

    const submit = async () => {
        if (!prompt.trim() || loading) return;
        loading = true;
        responseText = "";
        streamEvents = [];
        errorMessage = "";

        try {
            const res = await fetch("/api/client/ask/stream", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }]
                })
            });

            if (!res.ok || !res.body) {
                throw new Error("Failed to open Ask AI stream.");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const frames = buffer.split("\n\n");
                buffer = frames.pop() ?? "";

                for (const frame of frames) {
                    const lines = frame.split("\n");
                    const eventLine = lines.find((line) =>
                        line.startsWith("event:")
                    );
                    const dataLine = lines.find((line) =>
                        line.startsWith("data:")
                    );
                    if (!eventLine || !dataLine) continue;

                    const event = eventLine.replace("event:", "").trim();
                    const parsed = JSON.parse(
                        dataLine.replace("data:", "").trim()
                    );
                    appendEvent(event, parsed);

                    if (event === "token" && parsed.text) {
                        responseText += parsed.text;
                    }
                    if (event === "error" && parsed.message) {
                        errorMessage = parsed.message;
                    }
                }
            }
        } catch (err) {
            errorMessage =
                err instanceof Error ? err.message : "Unexpected Ask AI error";
        } finally {
            loading = false;
        }
    };
</script>

<svelte:head>
    <title>TigerJunction | Ask AI</title>
</svelte:head>

<div class="flex-1 w-full max-w-[1000px] mx-auto p-4 dark:text-white">
    <h1 class="text-2xl font-semibold mb-3">Ask AI</h1>
    <p class="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Ask questions about courses, instructors, and planning. Responses stream
        live from the Ask gateway.
    </p>

    <div class="flex gap-2 mb-4">
        <input
            class="flex-1 border rounded px-3 py-2 dark:bg-zinc-900 dark:border-zinc-700"
            placeholder="Ask something like: top LA courses with no final"
            bind:value={prompt}
            onkeydown={(e) => e.key === "Enter" && submit()} />
        <button
            class="px-4 py-2 rounded bg-zinc-900 text-white dark:bg-zinc-200 dark:text-zinc-900 disabled:opacity-50"
            onclick={submit}
            disabled={loading}>
            {loading ? "Streaming..." : "Ask"}
        </button>
    </div>

    {#if errorMessage}
        <div class="mb-3 rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 dark:bg-red-950 dark:border-red-900 dark:text-red-200">
            {errorMessage}
        </div>
    {/if}

    <div class="rounded border p-3 min-h-32 dark:border-zinc-700 dark:bg-zinc-900/40">
        <div class="text-sm whitespace-pre-wrap">{responseText || "No response yet."}</div>
    </div>

    <h2 class="text-sm font-semibold mt-4 mb-2">Stream Events</h2>
    <div class="rounded border p-3 max-h-72 overflow-auto text-xs dark:border-zinc-700 dark:bg-zinc-900/40">
        {#if streamEvents.length === 0}
            <div class="text-zinc-500">No events yet.</div>
        {:else}
            {#each streamEvents as item}
                <div class="mb-2">
                    <span class="font-semibold">{item.event}</span>
                    <span class="ml-2 text-zinc-500">{JSON.stringify(item.data)}</span>
                </div>
            {/each}
        {/if}
    </div>
</div>
