import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <button>foo++</button> <button>++foo</button> <p> </p> <button>bar.bar++</button> <button>++bar.bar</button>`, 1);

export default function Main($$anchor) {
	let foo = $.mutable_source(0);
	let bar = $.mutable_source({ bar: 0 });
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var button = $.sibling(p, 2);
	var button_1 = $.sibling(button, 2);
	var p_1 = $.sibling(button_1, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	var button_2 = $.sibling(p_1, 2);
	var button_3 = $.sibling(button_2, 2);

	$.template_effect(() => {
		$.set_text(text, $.get(foo));
		$.set_text(text_1, ($.get(bar), $.untrack(() => $.get(bar).bar)));
	});

	$.event('click', button, () => $.update(foo));
	$.event('click', button_1, () => $.update_pre(foo));
	$.event('click', button_2, () => $.mutate(bar, $.get(bar).bar++));
	$.event('click', button_3, () => $.mutate(bar, ++$.get(bar).bar));
	$.append($$anchor, fragment);
}