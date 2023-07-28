<script lang="ts">
export let selected = true;
</script>

<button class="flex items-center
{selected && 'bg-blue-500 text-white'}">
    <slot name="icon">
        !
    </slot>
    <slot name="text">
        ERROR
    </slot>
</button>