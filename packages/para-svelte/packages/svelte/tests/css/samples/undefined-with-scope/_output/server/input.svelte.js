import * as $ from 'svelte/internal/server';

export default function Input($$renderer) {
	$$renderer.push(`<p${$.attr_class($.clsx(undefined), 'svelte-xyz')}>Foo</p> <p${$.attr_class(undefined, 'svelte-xyz')}>Bar</p>`);
}