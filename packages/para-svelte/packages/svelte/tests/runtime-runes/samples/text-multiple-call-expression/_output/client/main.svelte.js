import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <button> </button> `, 1);

export default function Main($$anchor) {
	let x = $.state(0);
	let y = $.state(0);

	function getX() {
		console.log('x');

		return $.get(x);
	}

	function getY() {
		console.log('y');

		return $.get(y);
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);

	var text_2 = $.sibling(button_1);

	$.template_effect(
		($0, $1) => {
			$.set_text(text, $.get(x));
			$.set_text(text_1, $.get(y));
			$.set_text(text_2, ` ${$0 ?? ''}|${$1 ?? ''}`);
		},
		[() => getX(), () => getY()]
	);

	$.event('click', button, () => $.update(x));
	$.event('click', button_1, () => $.update(y));
	$.append($$anchor, fragment);
}