import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let one = $$props['one'];
	let two = $$props['two'];
	let three = $$props['three'];

	$$renderer.push(`<ul><li>${$.escape(one)}</li> <li>${$.escape(two)}</li> <li>${$.escape(three)}</li></ul>`);
	$.bind_props($$props, { one, two, three });
}