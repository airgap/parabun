import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<li> </li>`);
var root = $.from_html(`<button>Click Me</button> <ul></ul>`, 1);

export default function Main($$anchor) {
	let num = $.mutable_source(0);
	let cards = [];

	function click() {
		// updating cards via push should have no effect to the ul,
		// since its being mutated instead of reassigned
		cards.push($.update(num));
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.sibling(button);
	var ul = $.sibling(text);

	$.each(ul, 5, () => cards, $.index, ($$anchor, c) => {
		var li = root_1();
		var text_1 = $.child(li, true);

		$.reset(li);
		$.template_effect(() => $.set_text(text_1, $.get(c)));
		$.append($$anchor, li);
	});

	$.reset(ul);
	$.template_effect(() => $.set_text(text, ` ${$.get(num) ?? ''} `));
	$.event('click', button, click);
	$.append($$anchor, fragment);
}