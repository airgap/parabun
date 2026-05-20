import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let radio = $.fallback($$props['radio'], 'radio2');
	let check = $.fallback($$props['check'], () => ['check2'], true);

	$$renderer.push(`<input${$.attributes(
		{
			type: 'radio',
			checked: radio === 'radio1',
			value: 'radio1',
			...{}
		},
		void 0,
		void 0,
		void 0,
		4
	)}/> <input${$.attributes(
		{
			type: 'radio',
			checked: radio === 'radio2',
			value: 'radio2',
			...{}
		},
		void 0,
		void 0,
		void 0,
		4
	)}/> <input${$.attributes(
		{
			type: 'radio',
			checked: radio === 'radio3',
			value: 'radio3',
			...{}
		},
		void 0,
		void 0,
		void 0,
		4
	)}/> <input${$.attributes(
		{
			type: 'checkbox',
			checked: check.includes('check1'),
			value: 'check1',
			...{}
		},
		void 0,
		void 0,
		void 0,
		4
	)}/> <input${$.attributes(
		{
			type: 'checkbox',
			checked: check.includes('check2'),
			value: 'check2',
			...{}
		},
		void 0,
		void 0,
		void 0,
		4
	)}/> <input${$.attributes(
		{
			type: 'checkbox',
			checked: check.includes('check3'),
			value: 'check3',
			...{}
		},
		void 0,
		void 0,
		void 0,
		4
	)}/>`);

	$.bind_props($$props, { radio, check });
}