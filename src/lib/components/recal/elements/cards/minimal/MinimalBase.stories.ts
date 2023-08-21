import MinimalBase__SvelteComponent_ from "./MinimalBase.svelte";
import { action } from "@storybook/addon-actions";

export default {
    component: MinimalBase__SvelteComponent_,
    title: "Minimal Base",
}

const Template = ({ ...args }) => ({
    Component: MinimalBase__SvelteComponent_,
    props: args,
});


export const Default = Template.bind({});
