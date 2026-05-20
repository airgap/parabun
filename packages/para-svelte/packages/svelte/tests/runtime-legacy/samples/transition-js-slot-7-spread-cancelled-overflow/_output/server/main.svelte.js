import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let a1 = $.fallback($$props['a1'], 0);
	let a2 = $.fallback($$props['a2'], 0);
	let a3 = $.fallback($$props['a3'], 0);
	let a4 = $.fallback($$props['a4'], 0);
	let a5 = $.fallback($$props['a5'], 0);
	let a6 = $.fallback($$props['a6'], 0);
	let a7 = $.fallback($$props['a7'], 0);
	let a8 = $.fallback($$props['a8'], 0);
	let a9 = $.fallback($$props['a9'], 0);
	let a10 = $.fallback($$props['a10'], 0);
	let a11 = $.fallback($$props['a11'], 0);
	let a12 = $.fallback($$props['a12'], 0);
	let a13 = $.fallback($$props['a13'], 0);
	let a14 = $.fallback($$props['a14'], 0);
	let a15 = $.fallback($$props['a15'], 0);
	let a16 = $.fallback($$props['a16'], 0);
	let a17 = $.fallback($$props['a17'], 0);
	let a18 = $.fallback($$props['a18'], 0);
	let a19 = $.fallback($$props['a19'], 0);
	let a20 = $.fallback($$props['a20'], 0);
	let a21 = $.fallback($$props['a21'], 0);
	let a22 = $.fallback($$props['a22'], 0);
	let a23 = $.fallback($$props['a23'], 0);
	let a24 = $.fallback($$props['a24'], 0);
	let a25 = $.fallback($$props['a25'], 0);
	let a26 = $.fallback($$props['a26'], 0);
	let a27 = $.fallback($$props['a27'], 0);
	let a28 = $.fallback($$props['a28'], 0);
	let a29 = $.fallback($$props['a29'], 0);
	let a30 = $.fallback($$props['a30'], 0);
	let a31 = $.fallback($$props['a31'], 0);
	let a32 = $.fallback($$props['a32'], 0);
	let a33 = $.fallback($$props['a33'], 0);
	let visible = true;
	let state = 'Foo';
	let slotProps = { slotProps: 'Foo' };
	let props = $$props['props'];

	function show() {
		visible = true;
	}

	function hide() {
		visible = false;
		state = 'Bar';
		slotProps = { slotProps: 'Bar' };
	}

	$$renderer.push(`<div>outside ${$.escape(state)} ${$.escape(props)} ${$.escape(slotProps.slotProps)}</div> `);

	Nested($$renderer, {
		visible,
		slotProps,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { slotProps }) => {
				$$renderer.push(`<!---->inside ${$.escape(state)} ${$.escape(props)} ${$.escape(slotProps)}`);
			}
		}
	});

	$$renderer.push(`<!----> ${$.escape(a1 + a2 + a3 + a4 + a5 + a6 + a7 + a8 + a9 + a10 + a11 + a12 + a13 + a14 + a15 + a16 + a17 + a18 + a19 + a20 + a21 + a22 + a23 + a24 + a25 + a26 + a27 + a28 + a29 + a30 + a31 + a32 + a33)}`);

	$.bind_props($$props, {
		a1,
		a2,
		a3,
		a4,
		a5,
		a6,
		a7,
		a8,
		a9,
		a10,
		a11,
		a12,
		a13,
		a14,
		a15,
		a16,
		a17,
		a18,
		a19,
		a20,
		a21,
		a22,
		a23,
		a24,
		a25,
		a26,
		a27,
		a28,
		a29,
		a30,
		a31,
		a32,
		a33,
		props,
		show,
		hide
	});
}