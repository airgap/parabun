import * as $ from 'svelte/internal/server';
import Two from './Two.svelte';

export default function One($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];

	Two($$renderer, {
		b,
		$$slots: {
			two: ($$renderer, { two }) => {
				{
					$$renderer.push(`<!--[-->`);
					$.slot($$renderer, $$props, 'one', { one: a, two }, null);
					$$renderer.push(`<!--]-->`);
				}
			}
		}
	});

	$.bind_props($$props, { a, b });
}