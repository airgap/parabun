import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let text = $.fallback($$props['text'], '');

	const updater = (event) => {
		text = event.target.textContent;
	};

	$$renderer.push(`<div contenteditable="false">${$.escape(text)}</div>`);
	$.bind_props($$props, { text });
}