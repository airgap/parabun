import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input type="checkbox"/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let cats = $.prop($$props, 'cats', 12);

	function someCheck() {}

	var $$exports = {
		get cats() {
			return cats();
		},

		set cats($$value) {
			cats($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, cats, (cat) => cat.name, ($$anchor, cat, $$index) => {
		var input = root_1();

		$.remove_input_defaults(input);

		$.bind_checked(input, () => $.get(cat).checked, ($$value) => (
			$.get(cat).checked = $$value,
			$.invalidate_inner_signals(() => (cats()))
		));

		$.event('change', input, someCheck);
		$.append($$anchor, input);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}