<script lang="ts">
export let selected = true;
</script>

<button class="flex items-center w-5/6 p-2 rounded-xl m-4
{selected && 'bg-primary text-white'}">
    <slot name="icon">
        !
    </slot>
    <slot name="text">
        ERROR
    </slot>
</button>