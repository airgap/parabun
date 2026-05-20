import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12, 0);

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, count()));
	$.delegated('click', button, () => $.update_prop(count));
	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);
customElements.define('custom-element', $.create_custom_element(_unknown_, { count: {} }, [], [], { mode: 'open' }));