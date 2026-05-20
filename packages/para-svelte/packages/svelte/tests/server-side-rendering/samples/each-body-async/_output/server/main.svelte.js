import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like({ length: 1 });

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let data;
		var promises = $$renderer.run([async () => data = (await $.save(Promise.resolve("each")))()]);

		$$renderer.push(`<!---->`);
		$$renderer.async([promises[0]], ($$renderer) => $$renderer.push(() => $.escape(data)));
	}

	$$renderer.push(`<!--]--> `);

	const each_array_1 = $.ensure_array_like({ length: 0 });

	if (each_array_1.length !== 0) {
		$$renderer.push('<!--[-->');

		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			$$renderer.push(`<!---->should not see this`);
		}
	} else {
		$$renderer.push('<!--[!-->');

		let data;
		var promises_1 = $$renderer.run([async () => data = (await $.save(Promise.resolve("else")))()]);

		$$renderer.push(`<!---->`);
		$$renderer.async([promises_1[0]], ($$renderer) => $$renderer.push(() => $.escape(data)));
	}

	$$renderer.push(`<!--]-->`);
}