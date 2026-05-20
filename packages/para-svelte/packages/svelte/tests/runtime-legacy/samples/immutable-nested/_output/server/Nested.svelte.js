import * as $ from 'svelte/internal/server';
import { beforeUpdate, onMount } from 'svelte';

export default function Nested($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let mounted = false;
		let count = $.fallback($$props['count'], 0);
		let foo = $.fallback($$props['foo'], () => ({ bar: 'baz' }), true);

		onMount(() => {
			mounted = true;
		});

		beforeUpdate(() => {
			if (mounted) count += 1;
		});

		$$renderer.push(`<h3>Called ${$.escape(count)} times.</h3> <p>${$.escape(foo.bar)} ${$.escape(mounted)}</p>`);
		$.bind_props($$props, { count, foo });
	});
}