import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let domain = $.fallback($$props['domain'], () => [0, 10], true);
		let range = $.fallback($$props['range'], () => [0, 100], true);
		let x = $.fallback($$props['x'], 5);
		let scale;

		$: scale = (num) => {
			const t = domain[0] + (num - domain[0]) / (domain[1] - domain[0]);

			return range[0] + t * (range[1] - range[0]);
		};

		$$renderer.push(`<p>${$.escape(scale(x))}</p>`);
		$.bind_props($$props, { domain, range, x });
	});
}