import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	let promise = $$props['promise'];

	$.await($$renderer, promise, () => {}, (value) => {
		Foo($$renderer, { value });
	});

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { promise });
}