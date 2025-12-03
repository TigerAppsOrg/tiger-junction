<script lang="ts">
    import StdModal from "$lib/components/ui/StdModal.svelte";

    let { showModal = false }: { showModal?: boolean } = $props();
</script>

<StdModal title="Statistics" stdClose={true} {showModal}></StdModal>
