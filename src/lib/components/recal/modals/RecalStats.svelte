<script lang="ts">
    import StdModal from "$lib/components/ui/StdModal.svelte";

    export let showModal: boolean = false;
</script>

<StdModal title="Statistics" stdClose={true} {showModal}></StdModal>
