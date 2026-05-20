import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	const enabled = true;

	$$renderer.push(`<div${$.attr_class('svelte-xyz', void 0, { 'foo:bar': enabled })}>Hello world</div>`);
}