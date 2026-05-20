import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let div = $.prop($$props, 'div', 12);

	var $$exports = {
		get div() {
			return div();
		},

		set div($$value) {
			div($$value);
			$.flush();
		}
	};

	var div_1 = root();
	var text = $.child(div_1);

	$.reset(div_1);
	$.bind_this(div_1, ($$value) => div($$value), () => div());
	$.template_effect(() => $.set_text(text, `has div: ${!!div()}`));
	$.append($$anchor, div_1);

	return $.pop($$exports);
}