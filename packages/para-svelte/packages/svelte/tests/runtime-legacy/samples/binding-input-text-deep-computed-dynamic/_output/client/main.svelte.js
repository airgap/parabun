import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> <pre> </pre>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let obj = $.prop($$props, 'obj', 12);
	let prop = $.prop($$props, 'prop', 12);

	var $$exports = {
		get obj() {
			return obj();
		},

		set obj($$value) {
			obj($$value);
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

	$.init();

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var pre = $.sibling(input, 2);
	var text = $.child(pre, true);

	$.reset(pre);

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.deep_read_state(obj()),
			$.untrack(() => JSON.stringify(obj()))
		)
	]);

	$.bind_value(input, () => obj()[prop()], ($$value) => obj(obj()[prop()] = $$value, true));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}