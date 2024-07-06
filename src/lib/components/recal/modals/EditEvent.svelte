<script lang="ts">
    import StdModal from "$lib/components/elements/StdModal.svelte";

    export let showModal: boolean = false;
</script>

<StdModal title="Edit Custom Block" stdClose={true} {showModal}></StdModal>
