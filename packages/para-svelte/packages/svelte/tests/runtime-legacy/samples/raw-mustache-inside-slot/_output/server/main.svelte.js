import * as $ from 'svelte/internal/server';
import Component from './Component.svelte';

export default function Main($$renderer) {
	let content;
	let content1 = `<p>First line</p>`;
	let content2 = `<p>Another first line</p>`;
	let show = false;

	$: content = show ? content1 : content2;

	$$renderer.push(`<button>Switch</button> `);

	Component($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`${$.html(content)}`);
		},
		$$slots: { default: true }
	});

	$$renderer.push(`<!---->`);
}