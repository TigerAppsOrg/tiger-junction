<script lang="ts">
    let {
        text,
        direction = "up",
        class: className = ""
    }: {
        text: string;
        direction?: "up" | "down";
        class?: string;
    } = $props();
</script>

<div class="rotated-text-wrapper {direction} {className}">
    <span class="rotated-text">{text}</span>
</div>

<style lang="postcss">
    .rotated-text-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .rotated-text {
        font-family: "Inter", sans-serif;
        font-size: clamp(0.6rem, 0.9vw, 0.8rem);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3em;
        white-space: nowrap;
        color: black;
    }

    /* Up direction: text reads bottom to top */
    .rotated-text-wrapper.up .rotated-text {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
    }

    /* Down direction: text reads top to bottom */
    .rotated-text-wrapper.down .rotated-text {
        writing-mode: vertical-rl;
    }
</style>
