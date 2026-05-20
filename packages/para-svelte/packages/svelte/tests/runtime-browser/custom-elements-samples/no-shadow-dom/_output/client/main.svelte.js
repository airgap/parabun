import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="svelte-bt9zrl"> </h1>`);
const $$css = { hash: 'svelte-bt9zrl', code: 'h1.svelte-bt9zrl {color:red;}' };

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);
	$.append_styles($$anchor, $$css);

	let name = $.prop($$props, 'name', 12);

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		}
	};

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `Hello ${name() ?? ''}!`));
	$.append($$anchor, h1);

	return $.pop($$exports);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, { name: {} }, [], []));