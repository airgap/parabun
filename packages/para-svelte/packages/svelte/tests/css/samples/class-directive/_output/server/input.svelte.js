import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<div${$.attr_class('zero svelte-xyz', void 0, { 'first': true })}></div> <div${$.attr_class('svelte-xyz', void 0, { 'second': true, 'third': true })}></div>`);
}