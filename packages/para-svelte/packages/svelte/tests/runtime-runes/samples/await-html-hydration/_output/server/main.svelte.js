import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<div>`);

	$$renderer.child_block(async ($$renderer) => {
		$$renderer.push($.html((await $.save(Promise.resolve(`<span>Foo</span>`)))()));
	});

	$$renderer.push(`</div>`);
}