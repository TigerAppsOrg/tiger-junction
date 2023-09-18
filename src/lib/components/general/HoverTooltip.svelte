<script lang="ts">
export let content: string;
let x = 0;
let y = 0;

const handleMouseMove = (event: MouseEvent) => {
    x = event.clientX + 10; 
    y = event.clientY + 10; 
}
</script>

<div class="tooltip absolute" style="left: {x}px; top: {y}px;">
    {content}
</div>

<style>
.tooltip {
    position: fixed;
    z-index: 9999;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 0.5rem;
    border-radius: 0.25rem;
    pointer-events: none;
    transform: translate(-50%, -50%);
}
</style>
