import * as $ from 'svelte/internal/server';
import action from './util.js';

export default function Main($$renderer, $$props) {
	let collect = $$props['collect'];

	function each_action(_, fn) {
		fn('each_action');
	}

	const array = [each_action];

	$$renderer.push(`<div></div> <ul><!--[-->`);

	const each_array = $.ensure_array_like(array);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let action = each_array[$$index];

		$$renderer.push(`<div></div>`);
	}

	$$renderer.push(`<!--]--></ul>`);
	$.bind_props($$props, { collect });
}