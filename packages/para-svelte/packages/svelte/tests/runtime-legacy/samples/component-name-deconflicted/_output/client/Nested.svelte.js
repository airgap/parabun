import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span> </span>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let nested = $.prop($$props, 'nested', 12);

	var $$exports = {
		get nested() {
			return nested();
		},

		set nested($$value) {
			nested($$value);
			$.flush();
		}
	};

	var span = root();
	var text = $.child(span, true);

	$.reset(span);
	$.template_effect(() => $.set_text(text, nested()));
	$.append($$anchor, span);

	return $.pop($$exports);
}