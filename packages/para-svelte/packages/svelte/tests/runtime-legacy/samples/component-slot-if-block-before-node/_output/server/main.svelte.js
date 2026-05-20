import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	Nested($$renderer, {
		children: ($$renderer) => {
			if (foo) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<p>conditional</p>`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <p>unconditional</p>`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { foo });
}