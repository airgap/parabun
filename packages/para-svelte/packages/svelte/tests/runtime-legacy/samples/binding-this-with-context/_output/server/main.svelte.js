import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let items = $.fallback($$props['items'], () => ['foo', 'bar', 'baz'], true);
		let divs = $.fallback($$props['divs'], () => [], true);
		let spans = $.fallback($$props['spans'], () => ({}), true);
		let ps = $.fallback($$props['ps'], () => [], true);
		let hrs = $.fallback($$props['hrs'], () => ({}), true);
		const prefix = '-';

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(items);

		for (let j = 0, $$length = each_array.length; j < $$length; j++) {
			let item = each_array[j];

			$$renderer.push(`<div>${$.escape(item)}</div>`);
		}

		$$renderer.push(`<!--]--> <!--[-->`);

		const each_array_1 = $.ensure_array_like(Object.entries(items));

		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let [key, val] = each_array_1[$$index_1];

			$$renderer.push(`<span>${$.escape(val)}</span>`);
		}

		$$renderer.push(`<!--]--> <ul><!--[-->`);

		const each_array_2 = $.ensure_array_like(items);

		for (let j = 0, $$length = each_array_2.length; j < $$length; j++) {
			let thing = each_array_2[j];

			$$renderer.push(`<li><p>${$.escape(thing)}</p></li>`);
		}

		$$renderer.push(`<!--]--></ul> <ul><!--[-->`);

		const each_array_3 = $.ensure_array_like(items);

		for (let j = 0, $$length = each_array_3.length; j < $$length; j++) {
			let sure = each_array_3[j];

			$$renderer.push(`<li><hr/></li>`);
		}

		$$renderer.push(`<!--]--></ul>`);
		$.bind_props($$props, { items, divs, spans, ps, hrs });
	});
}