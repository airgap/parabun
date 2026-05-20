import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);
var root = $.from_html(`<!> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => [[0, 'foo'], [1, 'bar'], [2, 'baz']]);
	let first = $.prop($$props, 'first', 12, '');
	let second = $.prop($$props, 'second', 12, '');
	let x = $.prop($$props, 'x', 12, 0);
	let y = $.prop($$props, 'y', 12, 0);

	function tap(node, callback) {
		function clickHandler(event) {
			callback();
		}

		node.addEventListener('click', clickHandler, false);

		return {
			destroy() {
				node.addEventListener('click', clickHandler, false);
			}
		};
	}

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		},

		get first() {
			return first();
		},

		set first($$value) {
			first($$value);
			$.flush();
		},

		get second() {
			return second();
		},

		set second($$value) {
			second($$value);
			$.flush();
		},

		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get y() {
			return y();
		},

		set y($$value) {
			y($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node_1 = $.first_child(fragment);

	$.each(node_1, 1, items, $.index, ($$anchor, $$item) => {
		var $$array = $.derived(() => $.to_array($.get($$item), 2));
		let item0 = () => $.get($$array)[0];
		let item1 = () => $.get($$array)[1];
		var button = root_1();
		var text = $.child(button);

		$.reset(button);
		$.action(button, ($$node, $$action_arg) => tap?.($$node, $$action_arg), () => () => (first(item0()), second(item1())));
		$.template_effect(() => $.set_text(text, `${item0() ?? ''}: ${item1() ?? ''}`));
		$.append($$anchor, button);
	});

	var p = $.sibling(node_1, 2);
	var text_1 = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_2 = $.child(p_1);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text_1, `first: ${first() ?? ''}`);
		$.set_text(text_2, `second: ${second() ?? ''}`);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}