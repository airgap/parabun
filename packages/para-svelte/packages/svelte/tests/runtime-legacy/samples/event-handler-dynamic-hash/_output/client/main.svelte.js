import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p><button>set handler 1</button> <button>set handler 2</button></p> <p> </p> <button>click</button>`, 1);

export default function Main($$anchor) {
	let clickHandler = $.mutable_source({});
	let number = $.mutable_source(0);

	function updateHandler1() {
		$.mutate(clickHandler, $.get(clickHandler).f = () => $.set(number, 1));
	}

	function updateHandler2() {
		$.mutate(clickHandler, $.get(clickHandler).f = () => $.set(number, 2));
	}

	var fragment = root();
	var p = $.first_child(fragment);
	var button = $.child(p);
	var button_1 = $.sibling(button, 2);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text = $.child(p_1, true);

	$.reset(p_1);

	var button_2 = $.sibling(p_1, 2);

	$.template_effect(() => $.set_text(text, $.get(number)));
	$.event('click', button, updateHandler1);
	$.event('click', button_1, updateHandler2);

	$.event('click', button_2, function (...$$args) {
		$.get(clickHandler).f?.apply(this, $$args);
	});

	$.append($$anchor, fragment);
}