import * as $ from 'svelte/internal/server';

export default function Select($$renderer, $$props) {
	let value = $$props['value'];
	let other = $$props['other'];

	$$renderer.select({ multiple: true, value, ...other }, ($$renderer) => {
		$$renderer.option({ value: '1' }, ($$renderer) => {
			$$renderer.push(`option 1`);
		});

		$$renderer.option({ value: '2' }, ($$renderer) => {
			$$renderer.push(`option 2`);
		});
	});

	$.bind_props($$props, { value, other });
}