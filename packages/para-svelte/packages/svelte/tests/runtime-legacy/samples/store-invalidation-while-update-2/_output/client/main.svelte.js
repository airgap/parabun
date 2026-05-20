import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<div> </div> <div> </div> <input/> <button>click me</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $s = () => $.store_get(s, '$s', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();

	function action(node, binding) {
		return { update: (value) => s.set(value) };
	}

	let s = writable("simple");
	let v = $.mutable_source("");

	function click() {
		s.set('clicked');
	}

	$.init();

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div, true);

	$.reset(div);

	var div_1 = $.sibling(div, 2);
	var text_1 = $.child(div_1, true);

	$.reset(div_1);

	var input = $.sibling(div_1, 2);

	$.remove_input_defaults(input);
	$.effect(() => $.bind_value(input, () => $.get(v), ($$value) => $.set(v, $$value)));
	$.action(input, ($$node, $$action_arg) => action?.($$node, $$action_arg), () => $.get(v));

	var button = $.sibling(input, 2);

	$.template_effect(() => {
		$.set_text(text, $.get(v));
		$.set_text(text_1, $s());
	});

	$.event('click', button, click);
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}