import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let test = $$props['test'];
	let hidden = false;

	$$renderer.push(`<button>${$.escape(hidden ? "show" : "hide")} b</button> <label>a <input type="radio"${$.attr('checked', test === 'a', true)} value="a"/></label> `);

	if (!hidden) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<label>b <input type="radio"${$.attr('checked', test === 'b', true)} value="b"/></label>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> <label>c <input value="just here, so b is not the last input"/></label>`);
	$.bind_props($$props, { test });
}