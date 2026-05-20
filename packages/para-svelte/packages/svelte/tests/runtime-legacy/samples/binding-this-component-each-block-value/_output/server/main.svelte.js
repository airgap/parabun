import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $.fallback($$props['foo'], () => ({}), true);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(["first", "second", "third"]);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let value = each_array[$$index];

			Foo($$renderer, {});
			$$renderer.push(`<!----> <div>${$.escape(value)} has foo: ${$.escape(!!foo[value])}</div>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { foo });
	});
}