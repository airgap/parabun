import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div>`);
var root = $.from_html(`<button> </button> <button> </button> <!>`, 1);

export default function Main($$anchor) {
	function transition1() {
		console.log('transition 1');

		return { tick() {} };
	}

	function transition2() {
		console.log('transition 2');

		return { tick() {} };
	}

	let toggle = $.state(false);
	let toggleTransition = $.state(false);
	const derived = $.derived(() => $.get(toggleTransition) ? transition1 : transition2);
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);

	var node = $.sibling(button_1, 2);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.transition(3, div, () => $.get(derived));
			$.append($$anchor, div);
		};

		$.if(node, ($$render) => {
			if ($.get(toggle)) $$render(consequent);
		});
	}

	$.template_effect(() => {
		$.set_text(text, $.get(toggle));
		$.set_text(text_1, $.get(toggleTransition));
	});

	$.event('click', button, () => $.set(toggle, !$.get(toggle)));
	$.event('click', button_1, () => $.set(toggleTransition, !$.get(toggleTransition)));
	$.append($$anchor, fragment);
}