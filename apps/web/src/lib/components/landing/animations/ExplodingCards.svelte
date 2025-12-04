<script lang="ts">
    let {
        scrollProgress = 0
    }: {
        scrollProgress?: number;
    } = $props();

    // Course block colors
    const colors = {
        green: "hsl(120, 52%, 75%)",
        orange: "hsl(35, 99%, 65%)",
        blue: "hsl(197, 34%, 72%)",
        yellow: "hsl(60, 95%, 74%)",
        pink: "hsl(330, 100%, 80%)",
        purple: "hsl(305, 33%, 70%)"
    };

    // Card data with assembled and exploded positions
    type Card = {
        id: number;
        label: string;
        color: string;
        assembled: {
            x: number;
            y: number;
            z: number;
            rotateX: number;
            rotateY: number;
        };
        exploded: {
            x: number;
            y: number;
            z: number;
            rotateX: number;
            rotateY: number;
        };
    };

    const cards: Card[] = [
        {
            id: 1,
            label: "COS 126",
            color: colors.green,
            assembled: { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0 },
            exploded: { x: -180, y: -120, z: 80, rotateX: 15, rotateY: -25 }
        },
        {
            id: 2,
            label: "ECO 100",
            color: colors.orange,
            assembled: { x: 10, y: 15, z: 5, rotateX: 0, rotateY: 0 },
            exploded: { x: 150, y: -100, z: 60, rotateX: -10, rotateY: 30 }
        },
        {
            id: 3,
            label: "MAT 201",
            color: colors.blue,
            assembled: { x: -5, y: 30, z: 10, rotateX: 0, rotateY: 0 },
            exploded: { x: -120, y: 130, z: 100, rotateX: 20, rotateY: -15 }
        },
        {
            id: 4,
            label: "PHY 103",
            color: colors.yellow,
            assembled: { x: 15, y: 45, z: 15, rotateX: 0, rotateY: 0 },
            exploded: { x: 180, y: 80, z: 40, rotateX: -15, rotateY: 20 }
        },
        {
            id: 5,
            label: "MUS 105",
            color: colors.pink,
            assembled: { x: 5, y: 60, z: 20, rotateX: 0, rotateY: 0 },
            exploded: { x: -50, y: 160, z: 120, rotateX: 25, rotateY: -35 }
        },
        {
            id: 6,
            label: "PHI 201",
            color: colors.purple,
            assembled: { x: -10, y: 75, z: 25, rotateX: 0, rotateY: 0 },
            exploded: { x: 100, y: 150, z: 90, rotateX: -20, rotateY: 25 }
        }
    ];

    // Interpolate between assembled and exploded positions
    function lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    function getCardTransform(card: Card): string {
        const p = Math.min(1, Math.max(0, scrollProgress));
        const x = lerp(card.assembled.x, card.exploded.x, p);
        const y = lerp(card.assembled.y, card.exploded.y, p);
        const z = lerp(card.assembled.z, card.exploded.z, p);
        const rx = lerp(card.assembled.rotateX, card.exploded.rotateX, p);
        const ry = lerp(card.assembled.rotateY, card.exploded.rotateY, p);
        return `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
</script>

<div class="exploding-cards-container perspective-container">
    <div class="cards-wrapper preserve-3d">
        {#each cards as card}
            <div
                class="exploding-card preserve-3d gpu-accelerated"
                style="
                    transform: {getCardTransform(card)};
                    background: {card.color};
                ">
                <span class="card-label">{card.label}</span>
            </div>
        {/each}
    </div>
</div>

<style lang="postcss">
    .exploding-cards-container {
        width: 200px;
        height: 200px;
        position: relative;
    }

    .cards-wrapper {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .exploding-card {
        position: absolute;
        width: 100px;
        height: 50px;
        border: 3px solid black;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.05s ease-out;
        box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.2);
    }

    .card-label {
        font-family: "Inter", sans-serif;
        font-size: 0.75rem;
        font-weight: 700;
        color: rgba(0, 0, 0, 0.7);
        white-space: nowrap;
    }
</style>
