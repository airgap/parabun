import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Inner($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, value()));
	$.append($$anchor, text);

	return $.pop($$exports);
}

customElements.define('my-inner', $.create_custom_element(Inner, { value: { reflect: true } }, [], [], { mode: 'open' }));