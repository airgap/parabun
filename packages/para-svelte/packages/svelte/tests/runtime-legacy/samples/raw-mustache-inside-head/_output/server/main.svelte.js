import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let content;
	let content1 = `<style>body { color: red; }</style>`;
	let content2 = `<style>body { color: blue; }</style>`;
	let show = false;

	$: content = show ? content1 : content2;

	$.head('70s021', $$renderer, ($$renderer) => {
		$$renderer.push(`${$.html(content)} `);
		$$renderer.push(`<style>body { color: green; }</style>`);
	});

	$$renderer.push(`<button>Switch</button>`);
}