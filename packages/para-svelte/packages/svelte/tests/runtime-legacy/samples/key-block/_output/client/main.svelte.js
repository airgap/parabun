import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <div> </div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12, 0);
	let reactive = $.prop($$props, 'reactive', 12, 0);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get reactive() {
			return reactive();
		},

		set reactive($$value) {
			reactive($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.key(node, value, ($$anchor) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, value()));
		$.append($$anchor, div);
	});

	var div_1 = $.sibling(node, 2);
	var text_1 = $.child(div_1, true);

	$.reset(div_1);
	$.template_effect(() => $.set_text(text_1, reactive()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}