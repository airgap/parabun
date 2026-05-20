import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

export default function _unknown_($$anchor, $$props) {
	$.push($$props, true);

	$.user_effect(() => {
		$$props.$$host.dispatchEvent(new CustomEvent('change', { bubbles: true }));
	});

	$.pop();
}

customElements.define('child-element', $.create_custom_element(_unknown_, {}, [], [], { mode: 'open' }));