import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let new_name_1 = $.fallback($$props['new_name_1'], () => ({ bar: 5 }), true);
		let new_name_2 = 'value_2';

		$$renderer.push(`<h1>use-names</h1> <div class="svelte-f3mzam">${$.escape(new_name_1.bar)}</div> <pre style="color: var(--baz)">value_2</pre>`);
		$.bind_props($$props, { new_name_1 });
	});
}