import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let checked = false;
	var foo;
	var $$promises = $$renderer.run([async () => foo = await $.async_derived(() => checked)]);

	$$renderer.async([$$promises[0]], ($$renderer) => {
		$$renderer.push(`<input type="checkbox"${$.attr('checked', checked, true)}/>`);
	});

	$$renderer.push(` <!--[-->`);

	$$renderer.async_block([$$promises[0]], ($$renderer) => {
		const each_array = $.ensure_array_like(checked === foo() && [1]);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			$$renderer.push(`<p>`);
			$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(checked)));
			$$renderer.push(`</p>`);
		}
	});

	$$renderer.push(`<!--]-->`);
}