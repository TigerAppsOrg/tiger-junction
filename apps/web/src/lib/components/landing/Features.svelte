<script lang="ts">
    import RotatedText from "./ui/RotatedText.svelte";

    const features = [
        {
            id: "explore",
            title: "Explore",
            description:
                "Browse through lightning-fast course search. Use built-in ratings to make informed decisions, and powerful filters to narrow down your options.",
            color: "hsl(120, 52%, 75%)",
            icon: "search"
        },
        {
            id: "plan",
            title: "Plan",
            description:
                "Add courses to visualize your semester. Conflict avoidance ensures you never double-book yourself. Create multiple schedules to compare options.",
            color: "hsl(35, 99%, 65%)",
            icon: "calendar"
        },
        {
            id: "export",
            title: "Export",
            description:
                "Export your schedule to Google Calendar, iCal, or download as image. Changes sync automatically to keep everything up to date.",
            color: "hsl(330, 100%, 80%)",
            icon: "share"
        }
    ];
</script>

<section class="features" id="features">
    <div class="features-header">
        <h2 class="headline-large">How It Works</h2>
        <p class="features-subtitle body-inter">
            Three steps to your perfect schedule
        </p>
    </div>

    <div class="features-grid">
        {#each features as feature, index}
            <article
                class="feature-card"
                style="--accent-color: {feature.color}">
                <div class="feature-number">
                    <span>0{index + 1}</span>
                </div>
                <div class="feature-content">
                    <h3 class="feature-title">{feature.title}</h3>
                    <p class="feature-description body-inter">
                        {feature.description}
                    </p>
                </div>
                <div class="feature-accent"></div>
            </article>
        {/each}
    </div>

    <!-- Decorative side text -->
    <div class="features-side-text">
        <RotatedText text="Features" direction="down" />
    </div>
</section>

<style lang="postcss">
    .features {
        background: white;
        padding: 100px 60px;
        position: relative;
        border-top: 4px solid black;
    }

    .features-header {
        text-align: center;
        margin-bottom: 80px;
    }

    .features-subtitle {
        margin-top: 16px;
        font-size: 1.1rem;
        color: #666;
    }

    .features-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 30px;
        max-width: 1200px;
        margin: 0 auto;
    }

    .feature-card {
        position: relative;
        background: white;
        border: 4px solid black;
        padding: 40px 30px;
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
    }

    .feature-card:hover {
        transform: translate(-4px, -4px);
        box-shadow: 8px 8px 0 black;
    }

    .feature-number {
        position: absolute;
        top: -20px;
        left: 20px;
        background: white;
        padding: 0 10px;
    }

    .feature-number span {
        font-family: "Playfair Display", serif;
        font-size: 2.5rem;
        font-weight: 900;
        color: var(--accent-color);
        line-height: 1;
    }

    .feature-content {
        margin-top: 20px;
    }

    .feature-title {
        font-family: "Inter", sans-serif;
        font-size: 1.5rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 16px;
    }

    .feature-description {
        font-size: 0.95rem;
        color: #444;
        line-height: 1.7;
    }

    .feature-accent {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: var(--accent-color);
    }

    .features-side-text {
        position: absolute;
        right: 20px;
        top: 50%;
        transform: translateY(-50%);
    }

    /* Responsive */
    @media (max-width: 1024px) {
        .features-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .features-grid .feature-card:last-child {
            grid-column: span 2;
            max-width: 50%;
            margin: 0 auto;
        }
    }

    @media (max-width: 768px) {
        .features {
            padding: 80px 30px;
        }

        .features-grid {
            grid-template-columns: 1fr;
        }

        .features-grid .feature-card:last-child {
            grid-column: span 1;
            max-width: 100%;
        }

        .features-side-text {
            display: none;
        }
    }
</style>
