import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = () => true;
	let data = $.fallback($$props['data'], () => [{ foo: [{ foo: [{ bar: "one" }, { bar: "two" }] }] }], true);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(data);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let datum = each_array[$$index];

		if (datum.foo && a()) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>OK</p> `);
			Main($$renderer, { data: datum.foo });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`<pre>${$.escape(datum.bar)}</pre>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { data });
}