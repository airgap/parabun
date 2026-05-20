import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let inner_clicked = $$props['inner_clicked'];
	let outer_clicked = $$props['outer_clicked'];

	function handle_inner_click(event) {
		inner_clicked = true;
	}

	function handle_outer_click(event) {
		outer_clicked = true;
	}

	$$renderer.push(`<div><button>click me</button></div>`);
	$.bind_props($$props, { inner_clicked, outer_clicked });
}