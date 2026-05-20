import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let props = $$props['props'];
	let radioValue;

	$$renderer.push(`<input${$.attributes(
		{
			type: 'radio',
			value: 'abc',
			...props,
			checked: radioValue === 'abc'
		},
		void 0,
		void 0,
		void 0,
		4
	)}/>`);

	$.bind_props($$props, { props });
}