import * as $ from 'svelte/internal/server';
import { omit } from './utils.js';

export default function InputTwo($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.component(($$renderer) => {
		let props;
		let value = $$props['value'];

		function onInput(e) {
			value = e.target.value;
		}

		$: props = omit($$sanitized_props, 'value', 'minlength');

		$$renderer.push(`<input${$.attributes({ type: 'text', minlength: '10', value, ...props }, void 0, void 0, void 0, 4)}/>`);
		$.bind_props($$props, { value });
	});
}