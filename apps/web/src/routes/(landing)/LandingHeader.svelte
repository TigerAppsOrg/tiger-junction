<script lang="ts">
    import { handleLogin } from "$lib/scripts/supabase";
    import type { SupabaseClient } from "@supabase/supabase-js";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    let { supabase }: { supabase: SupabaseClient } = $props();
</script>

<header class="header-wrapper">
    <div class="header-inner">
        <nav class="header-nav">
            <!-- Logo -->
            <a
                href="/"
                onclick={e => {
                    e.preventDefault();
                    if ($page.url.pathname === "/") {
                        document.getElementById("hero")?.scrollIntoView({
                            behavior: "smooth"
                        });
                    } else {
                        goto("/");
                    }
                }}
                class="logo-link">
                <img
                    src="/tjlogonew.png"
                    alt="Tiger Junction logo"
                    class="logo-img" />
                <span class="logo-text">TigerJunction</span>
            </a>

            <!-- Nav Links -->
            <div class="nav-links">
                {#if $page.url.pathname === "/"}
                    <a
                        href="/#features"
                        onclick={e => {
                            e.preventDefault();
                            document
                                .getElementById("features")
                                ?.scrollIntoView({
                                    behavior: "smooth"
                                });
                        }}
                        class="nav-link">
                        Features
                    </a>
                {/if}
            </div>

            <!-- Login Button -->
            <div class="nav-actions">
                <button onclick={() => handleLogin(supabase)} class="login-btn">
                    Log In
                </button>
            </div>
        </nav>
    </div>
</header>

<style lang="postcss">
    .header-wrapper {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        padding: 16px 20px;
    }

    .header-inner {
        max-width: 1400px;
        margin: 0 auto;
        background: white;
        border: 3px solid black;
        padding: 12px 24px;
    }

    .header-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    /* Logo */
    .logo-link {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        color: black;
    }

    .logo-img {
        width: 36px;
        height: 36px;
    }

    .logo-text {
        font-family: "Inter", sans-serif;
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: -0.02em;
    }

    /* Nav Links */
    .nav-links {
        display: flex;
        align-items: center;
        gap: 32px;
    }

    .nav-link {
        font-family: "Inter", sans-serif;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: black;
        text-decoration: none;
        position: relative;
        padding: 4px 0;
    }

    .nav-link::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: black;
        transform: scaleX(0);
        transform-origin: right;
        transition: transform 0.2s ease;
    }

    .nav-link:hover::after {
        transform: scaleX(1);
        transform-origin: left;
    }

    /* Login Button - Brutalist Style */
    .login-btn {
        font-family: "Inter", sans-serif;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background: black;
        color: white;
        border: 2px solid black;
        padding: 10px 24px;
        cursor: pointer;
        transition:
            background 0.15s ease,
            color 0.15s ease;
    }

    .login-btn:hover {
        background: white;
        color: black;
    }

    /* Responsive */
    @media (max-width: 640px) {
        .header-wrapper {
            padding: 12px 16px;
        }

        .header-inner {
            padding: 10px 16px;
        }

        .logo-text {
            display: none;
        }

        .nav-links {
            display: none;
        }

        .login-btn {
            padding: 8px 16px;
            font-size: 0.8rem;
        }
    }
</style>
