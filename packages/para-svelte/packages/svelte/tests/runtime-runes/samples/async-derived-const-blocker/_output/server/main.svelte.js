import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	var d, showFetchCta;

	var $$promises = $$renderer.run([
		async () => d = await $.async_derived(() => Promise.resolve({ data: "data", hasData: true })),
		() => showFetchCta = $.derived(() => d().hasData)
	]);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		if (d()) {
			$$renderer.push('<!--[0-->');

			let data;
			let hasData;
			var promises = $$renderer.run([() => $$promises[1], () => ({ data, hasData } = d())]);

			$$renderer.async_block([promises[1]], ($$renderer) => {
				if (hasData) {
					$$renderer.push('<!--[0-->');
					$$renderer.push(`<p>`);
					$$renderer.async([promises[1]], ($$renderer) => $$renderer.push(() => $.escape(data)));
					$$renderer.push(`</p>`);
				} else {
					$$renderer.push('<!--[-1-->');

					$$renderer.async_block([$$promises[1]], ($$renderer) => {
						if (showFetchCta()) {
							$$renderer.push('<!--[0-->');
							$$renderer.push(`<p>Fetch now</p>`);
						} else {
							$$renderer.push('<!--[-1-->');
							$$renderer.push(`<p>No data</p>`);
						}
					});

					$$renderer.push(`<!--]-->`);
				}
			});

			$$renderer.push(`<!--]-->`);
		} else {
			$$renderer.push('<!--[-1-->');
		}
	});

	$$renderer.push(`<!--]-->`);
}