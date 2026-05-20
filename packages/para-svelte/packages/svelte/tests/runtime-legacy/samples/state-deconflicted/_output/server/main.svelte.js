import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let state = $$props['state'];
	let states = $$props['states'];

	$$renderer.push(`<p>Current state: ${$.escape(state)}</p> <ul><!--[-->`);

	const each_array = $.ensure_array_like(states);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let state = each_array[$$index];

		$$renderer.push(`<li>${$.escape(state)}</li>`);
	}

	$$renderer.push(`<!--]--></ul>`);
	$.bind_props($$props, { state, states });
}