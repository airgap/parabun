import * as $ from 'svelte/internal/server';
import { writable } from 'svelte/store';
import Input from './Input.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let value = writable({ value: '' });
		let callback = $.fallback($$props['callback'], () => {});

		value.subscribe(() => {
			callback();
		});

		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			$$renderer.push(`<input${$.attr('value', $.store_get($$store_subs ??= {}, '$value', value).value)}/> `);

			Input($$renderer, {
				get value() {
					return $.store_get($$store_subs ??= {}, '$value', value).value;
				},

				set value($$value) {
					$.store_mutate($$store_subs ??= {}, '$value', value, $.store_get($$store_subs ??= {}, '$value', value).value = $$value);
					$$settled = false;
				}
			});

			$$renderer.push(`<!----> <div>${$.escape($.store_get($$store_subs ??= {}, '$value', value).value)}</div>`);
		}

		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);

		$$renderer.subsume($$inner_renderer);

		if ($$store_subs) $.unsubscribe_stores($$store_subs);

		$.bind_props($$props, { callback });
	});
}