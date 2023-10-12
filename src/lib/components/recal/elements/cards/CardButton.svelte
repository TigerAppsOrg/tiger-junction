<script lang="ts">
export let href = "";
export let title = "";
</script>

<a {href} target="_blank" class="">
    <button class="">
        <div>
            {title}
        </div>
        <div>
            <slot></slot>
        </div>
    </button>
</a>

<style lang="postcss">

</style>