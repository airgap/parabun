import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let trusted = $.prop($$props, 'trusted', 12, true);

	var $$exports = {
		get trusted() {
			return trusted();
		},

		set trusted($$value) {
			trusted($$value);
			$.flush();
		}
	};

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `Only trusted events: ${trusted() ? 'true' : 'false'}`));
	$.event('click', button, $.trusted(() => trusted(false)));
	$.append($$anchor, button);

	return $.pop($$exports);
}