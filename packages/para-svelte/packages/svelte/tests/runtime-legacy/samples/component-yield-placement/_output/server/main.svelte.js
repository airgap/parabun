import * as $ from 'svelte/internal/server';
import Modal from './Modal.svelte';

export default function Main($$renderer, $$props) {
	let showModal = $$props['showModal'];

	if (showModal) {
		$$renderer.push('<!--[0-->');

		Modal($$renderer, {
			children: ($$renderer) => {
				$$renderer.push(`<h2>Hello!</h2>`);
			},
			$$slots: { default: true }
		});
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<button>show modal</button>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { showModal });
}