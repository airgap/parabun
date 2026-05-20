import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input/> <pre> </pre>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let objects = $.prop($$props, 'objects', 12);
	let prop = $.prop($$props, 'prop', 12);

	var $$exports = {
		get objects() {
			return objects();
		},

		set objects($$value) {
			objects($$value);
			$.flush();
		},

		get prop() {
			return prop();
		},

		set prop($$value) {
			prop($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, objects, $.index, ($$anchor, obj, $$index) => {
		var fragment_1 = root_1();
		var input = $.first_child(fragment_1);

		$.remove_input_defaults(input);

		var pre = $.sibling(input, 2);
		var text = $.child(pre, true);

		$.reset(pre);

		$.template_effect(($0) => $.set_text(text, $0), [
			() => ($.get(obj), $.untrack(() => JSON.stringify($.get(obj))))
		]);

		$.bind_value(input, () => $.get(obj)[prop()], ($$value) => (
			$.get(obj)[prop()] = $$value,
			$.invalidate_inner_signals(() => (objects()))
		));

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}