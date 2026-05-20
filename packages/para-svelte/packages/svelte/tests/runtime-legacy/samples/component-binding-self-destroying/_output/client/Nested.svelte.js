import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>Hide</button>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let show = $.prop($$props, 'show', 12);

	var $$exports = {
		get show() {
			return show();
		},

		set show($$value) {
			show($$value);
			$.flush();
		}
	};

	var button = root();

	$.event('click', button, () => show(false));
	$.append($$anchor, button);

	return $.pop($$exports);
}