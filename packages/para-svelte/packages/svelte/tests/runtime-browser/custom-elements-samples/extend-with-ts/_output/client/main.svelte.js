import 'svelte/internal/disclose-version';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, true);

	let name = $.prop($$props, 'name', 7);

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `name: ${name() ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, { name: {} }, [], [], { mode: 'open' }, (customClass) => {
	return class extends customClass {
		test = "test";
	};
}));