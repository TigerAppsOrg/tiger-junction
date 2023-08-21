import Modal__SvelteComponent_ from "./Modal.svelte";
import { action } from "@storybook/addon-actions";

export default {
    component: Modal__SvelteComponent_,
    title: "Modal (Template)",
}

const Template = ({ ...args }) => ({
    Component: Modal__SvelteComponent_,
    props: args,
});


export const Default = Template.bind({});
