<script lang="ts">
    import { darkTheme } from "$lib/stores/state";
    import sunIcon from "$lib/img/icons/sunicon.svg";
    import moonIcon from "$lib/img/icons/moonicon.svg";
</script>

<input type="checkbox" id="switch" class="hidden" bind:checked={$darkTheme}>

<div class="toggle">
    <div class="indicator">
        <div class="icon-container">
            <img src={sunIcon} alt="Sun Icon" class="icon" />
            <img src={moonIcon} alt="Moon Icon" class="icon" />
        </div>
    </div>
</div>

<style lang="postcss">
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.toggle {
    background-color: zinc;
    width: 64px;
    height: 32px;
    border-radius: 16px;
    box-shadow: inset 0 8px 60px rgba(0, 0, 0, 0.05);
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
}

.indicator {
    background-color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    position: absolute;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease-in-out;
}

.icon-container {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.icon {

}

.icon.animated {
    animation: rotate 0.3s ease-in-out forwards;
}

@keyframes rotate {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(180deg);
    }
}


</style>
