import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from "./child.svelte";

export default function Main($$renderer) {
	let foo = 'foo';
	let bar = null;
	let spread = { class: { foo: true, bar: false } };

	$$renderer.push(`<div${$.attr_class($.clsx({ foo: true, bar: false }), 'svelte-70s021')}></div> <div${$.attr_class($.clsx(['foo', false && 'bar']), 'svelte-70s021')}></div> <div${$.attr_class($.clsx({ foo, bar }), 'svelte-70s021')}></div> <div${$.attr_class($.clsx([foo, bar]), 'svelte-70s021')}></div> <div${$.attributes({ ...spread }, 'svelte-70s021')}></div> `);
	Child($$renderer, { class: { foo: true, bar: false } });
	$$renderer.push(`<!----> `);
	Child($$renderer, { class: ['foo', false && 'bar'] });
	$$renderer.push(`<!----> `);
	Child($$renderer, { class: { foo, bar } });
	$$renderer.push(`<!----> `);
	Child($$renderer, { class: [foo, bar] });
	$$renderer.push(`<!----> `);
	Child($$renderer, $.spread_props([spread]));
	$$renderer.push(`<!----> <applied-to-custom-element${$.attr_class($.clsx({ foo, bar }), 'svelte-70s021')}></applied-to-custom-element> <button>update</button>`);
}