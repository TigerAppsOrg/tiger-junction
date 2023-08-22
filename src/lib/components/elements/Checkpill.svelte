<script lang="ts">
export let name: string = "";
</script>

<label for={name}>
    <input type="checkbox" name={name} id={name}>
    <span class="info flex items-center gap-1">
        <span>
            {name}
        </span>
        <span class="icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" 
            class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>              
        </span>
    </span>
</label>

<style lang="postcss">
label {
    @apply inline-block cursor-pointer select-none rounded-full;
}

input[type="checkbox"] {
    @apply hidden;
}

.info {
    @apply rounded-full px-4 py-2 border-2 border-slate-600/30
    dark:border-slate-200/30;
}

input[type="checkbox"]:checked ~ .info {
    @apply bg-green-300 dark:bg-synth-accent border-green-300
    dark:border-synth-accent;
}

.icon {
    @apply hidden;
}

input[type="checkbox"]:checked ~ .info .icon {
    @apply inline-block;
}
</style>