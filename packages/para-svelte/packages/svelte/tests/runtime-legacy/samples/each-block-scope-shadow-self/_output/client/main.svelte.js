import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input type="text"/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 28, () => ['a', 'b', 'c']);
	let data = $.prop($$props, 'data', 28, () => ({ 'a': 'A', 'b': 'B', 'c': 'C' }));

	function getData() {
		return data();
	}

	var $$exports = {
		getData,
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get data() {
			return data();
		},

		set data($$value) {
			data($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, x, $.index, ($$anchor, x, $$index, $$array) => {
		var input = root_1();

		$.remove_input_defaults(input);
		$.bind_value(input, () => data()[$.get(x)], ($$value) => data(data()[$.get(x)] = $$value, true));
		$.append($$anchor, input);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'getData', getData);

	return $.pop($$exports);
}