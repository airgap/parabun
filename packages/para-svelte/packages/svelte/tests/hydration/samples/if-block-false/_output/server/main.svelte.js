import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.push(`<p>before</p> `);

	if (foo) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>foo!</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> <p>after</p>`);
	$.bind_props($$props, { foo });
}