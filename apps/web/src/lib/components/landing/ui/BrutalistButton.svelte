<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        onclick,
        children,
        variant = "primary",
        size = "default"
    }: {
        onclick?: () => void;
        children: Snippet;
        variant?: "primary" | "secondary" | "ghost";
        size?: "default" | "large";
    } = $props();
</script>

<button class="geo-btn {variant} {size}" {onclick}>
    <span class="btn-text">{@render children()}</span>
    <span class="btn-arrow">
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
    </span>
</button>

<style lang="postcss">
    .geo-btn {
        @apply font-medium tracking-wide cursor-pointer relative overflow-hidden;
        font-family: "Inter", sans-serif;
        display: inline-flex;
        align-items: center;
        gap: 12px;
        background: transparent;
        border: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .btn-text {
        position: relative;
        z-index: 1;
    }

    .btn-arrow {
        display: flex;
        align-items: center;
        transition: transform 0.3s ease;
    }

    .geo-btn:hover .btn-arrow {
        transform: translateX(4px);
    }

    /* Sizes */
    .geo-btn.default {
        @apply text-base py-3;
    }

    .geo-btn.large {
        @apply text-lg py-4;
    }

    /* Variants */
    .geo-btn.primary {
        color: #6485fd;
    }

    .geo-btn.primary::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: linear-gradient(90deg, #6485fd, #f245c1);
        transform: scaleX(0);
        transform-origin: right;
        transition: transform 0.3s ease;
    }

    .geo-btn.primary:hover::after {
        transform: scaleX(1);
        transform-origin: left;
    }

    .geo-btn.secondary {
        color: #f245c1;
    }

    .geo-btn.secondary::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: #f245c1;
        transform: scaleX(0);
        transform-origin: right;
        transition: transform 0.3s ease;
    }

    .geo-btn.secondary:hover::after {
        transform: scaleX(1);
        transform-origin: left;
    }

    .geo-btn.ghost {
        color: black;
    }

    .geo-btn.ghost:hover {
        color: #6485fd;
    }
</style>
