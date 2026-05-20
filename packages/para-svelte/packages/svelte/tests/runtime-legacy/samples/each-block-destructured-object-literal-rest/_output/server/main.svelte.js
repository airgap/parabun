import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let objectsArray = $$props['objectsArray'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(objectsArray);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let {
			"quote": quotedProp,
			"wrong-quote": wrongQuote,
			16: sixteen,
			[10 + 7]: seventeen,
			...props
		} = each_array[$$index];

		$$renderer.push(`<p${$.attributes({ ...props })}>Quote: ${$.escape(quotedProp)}, Wrong Quote: ${$.escape(wrongQuote)}, 16: ${$.escape(sixteen)}, 17: ${$.escape(seventeen)}</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { objectsArray });
}