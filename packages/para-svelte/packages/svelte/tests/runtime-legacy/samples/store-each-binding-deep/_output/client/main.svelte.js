import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root_1 = $.from_html(`<input/>`);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $itemStore = () => $.store_get(itemStore, '$itemStore', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let itemStore = writable({ prop: { things: [{ name: "item store" }] } });

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, () => ($itemStore(), $.untrack(() => $itemStore().prop.things)), $.index, ($$anchor, thing, $$index) => {
		var input = root_1();

		$.remove_input_defaults(input);

		$.bind_value(input, () => $.get(thing).name, ($$value) => (
			$.get(thing).name = $$value,
			$.invalidate_inner_signals(() => ($itemStore())),
			$.invalidate_store($$stores, '$itemStore')
		));

		$.append($$anchor, input);
	});

	var p = $.sibling(node, 2);
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(() => $.set_text(text, (
		$itemStore(),
		$.untrack(() => $itemStore().prop.things[0].name)
	)));

	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}