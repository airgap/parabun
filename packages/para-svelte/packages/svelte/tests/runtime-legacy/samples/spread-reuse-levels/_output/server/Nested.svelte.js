import * as $ from 'svelte/internal/server';
import { beforeUpdate } from 'svelte';

export default function Nested($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = $$props['a'];
		let b = $$props['b'];
		let c = $$props['c'];
		let changed = {};
		let previous = {};

		beforeUpdate(() => {
			changed.a = a !== previous.a;
			changed.b = b !== previous.b;
			changed.c = c !== previous.c;
			previous.a = a;
			previous.b = b;
			previous.c = c;
		});

		$$renderer.push(`<pre>${$.escape(JSON.stringify({ a, b, c }))}</pre> <pre>${$.escape(JSON.stringify(changed))}</pre>`);
		$.bind_props($$props, { a, b, c });
	});
}