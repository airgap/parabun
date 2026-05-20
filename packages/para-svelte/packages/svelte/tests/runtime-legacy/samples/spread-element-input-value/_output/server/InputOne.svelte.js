import * as $ from 'svelte/internal/server';
import { omit } from './utils.js';

export default function InputOne($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.component(($$renderer) => {
		let props;
		let value = $$props['value'];

		function onInput(e) {
			value = e.target.value;
		}

		$: props = omit($$sanitized_props, 'value');

		$$renderer.push(`<input${$.attributes({ type: 'text', ...props, value }, void 0, void 0, void 0, 4)}/>`);
		$.bind_props($$props, { value });
	});
}