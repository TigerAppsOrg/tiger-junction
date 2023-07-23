<script lang="ts">
    import List from '$lib/components/List.svelte';
    export let data;
</script>

<List listData={data.certificateList} />