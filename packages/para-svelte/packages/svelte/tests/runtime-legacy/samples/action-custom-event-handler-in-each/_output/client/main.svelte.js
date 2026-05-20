import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);
var root = $.from_html(`<!> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 28, () => ['foo', 'bar', 'baz']);
	let fromDom = $.prop($$props, 'fromDom', 12, '');
	let fromState = $.prop($$props, 'fromState', 12, '');
	let x = $.prop($$props, 'x', 12, 0);
	let y = $.prop($$props, 'y', 12, 0);

	function tap(node, callback) {
		node.addEventListener('click', callback, false);

		return {
			destroy() {
				node.addEventListener('click', callback, false);
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

		get fromDom() {
			return fromDom();
		},

		set fromDom($$value) {
			fromDom($$value);
			$.flush();
		},

		get fromState() {
			return fromState();
		},

		set fromState($$value) {
			fromState($$value);
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

	$.each(node_1, 1, items, $.index, ($$anchor, item) => {
		var button = root_1();
		var text = $.child(button, true);

		$.reset(button);
		$.action(button, ($$node, $$action_arg) => tap?.($$node, $$action_arg), () => (e) => (fromDom(e.target.textContent), fromState($.get(item))));
		$.template_effect(() => $.set_text(text, $.get(item)));
		$.append($$anchor, button);
	});

	var p = $.sibling(node_1, 2);
	var text_1 = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_2 = $.child(p_1);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text_1, `fromDom: ${fromDom() ?? ''}`);
		$.set_text(text_2, `fromState: ${fromState() ?? ''}`);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}