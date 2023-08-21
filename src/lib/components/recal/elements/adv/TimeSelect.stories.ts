import TimeSelect__SvelteComponent_ from "./TimeSelect.svelte";
import { action } from "@storybook/addon-actions";

export default {
    component: TimeSelect__SvelteComponent_,
    title: "Time Select",
}

const Template = ({ ...args }) => ({
    Component: TimeSelect__SvelteComponent_,
    props: args,
});


export const Default = Template.bind({});
