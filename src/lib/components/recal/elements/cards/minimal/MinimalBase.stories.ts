import MinimalBase__SvelteComponent_ from "./MinimalBase.svelte";
import { action } from "@storybook/addon-actions";

const Template = ({ ...args }) => ({
    Component: MinimalBase__SvelteComponent_,
    props: args,
});

export const Default = Template.bind({});
Default.args = {
    
}