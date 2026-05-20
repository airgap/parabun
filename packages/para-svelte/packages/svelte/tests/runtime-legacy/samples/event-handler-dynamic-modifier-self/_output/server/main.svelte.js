import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let inner_clicked = $$props['inner_clicked'];
	let f;

	function handle_click(event) {
		inner_clicked = true;
	}

	f = handle_click;
	$$renderer.push(`<div><button>click me</button></div>`);
	$.bind_props($$props, { inner_clicked });
}