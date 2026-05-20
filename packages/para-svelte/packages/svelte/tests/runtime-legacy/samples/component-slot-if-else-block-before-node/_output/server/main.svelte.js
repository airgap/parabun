import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let enabled = $$props['enabled'];

	Nested($$renderer, {
		children: ($$renderer) => {
			if (!enabled) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<p>disabled</p>`);
			} else {
				$$renderer.push('<!--[-1-->');
				$$renderer.push(`<p>enabled</p>`);
			}

			$$renderer.push(`<!--]--> <p>unconditional</p>`);
		},
		$$slots: { default: true }
	});

	$.bind_props($$props, { enabled });
}