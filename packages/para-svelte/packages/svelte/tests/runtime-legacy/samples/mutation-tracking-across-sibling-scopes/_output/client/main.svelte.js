import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><input type="checkbox"/></div>`);
var root_2 = $.from_html(`<div> </div>`);
var root = $.from_html(`<!> <div></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const things = $.mutable_source([{ ok: true }, { ok: false }]);
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

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, () => $.get(things), $.index, ($$anchor, thing, $$index) => {
		var div_1 = root_1();
		var input = $.child(div_1);

		$.remove_input_defaults(input);
		$.reset(div_1);

		$.bind_checked(input, () => $.get(thing).ok, ($$value) => (
			$.get(thing).ok = $$value,
			$.invalidate_inner_signals(() => ($.get(things)))
		));

		$.append($$anchor, div_1);
	});

	var div_2 = $.sibling(node, 2);

	$.each(div_2, 5, () => $.get(things), $.index, ($$anchor, other) => {
		var div_3 = root_2();
		var text = $.child(div_3, true);

		$.reset(div_3);
		$.template_effect(() => $.set_text(text, ($.get(other), $.untrack(() => $.get(other).ok ? '+' : '-'))));
		$.append($$anchor, div_3);
	});

	$.reset(div_2);
	$.bind_this(div_2, ($$value) => div($$value), () => div());
	$.append($$anchor, fragment);

	return $.pop($$exports);
}