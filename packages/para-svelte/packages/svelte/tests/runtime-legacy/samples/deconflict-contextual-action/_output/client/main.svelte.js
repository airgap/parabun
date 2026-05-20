import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import action from './util.js';

var root_1 = $.from_html(`<div></div>`);
var root = $.from_html(`<div></div> <ul></ul>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let collect = $.prop($$props, 'collect', 12);

	function each_action(_, fn) {
		fn('each_action');
	}

	const array = [each_action];

	var $$exports = {
		get collect() {
			return collect();
		},

		set collect($$value) {
			collect($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);

	$.action(div, ($$node, $$action_arg) => action?.($$node, $$action_arg), collect);

	var ul = $.sibling(div, 2);

	$.each(ul, 5, () => array, $.index, ($$anchor, action, $$index, $$array) => {
		var div_1 = root_1();

		$.action(div_1, ($$node, $$action_arg) => $.get(action)?.($$node, $$action_arg), collect);
		$.append($$anchor, div_1);
	});

	$.reset(ul);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}