import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Item[$.FILENAME] = 'Item.svelte';

import * as $ from 'svelte/internal/client';
import { getContext } from 'svelte';

var root = $.add_locations($.from_html(`<div><!></div>`), Item[$.FILENAME], [[13, 0]]);

export default function Item($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Item);

	let listContext = getContext('list');
	let selected = $.tag($.derived(() => $.strict_equals(listContext?.selectedValue, $$props.value)), 'selected');

	$.inspect(() => [$$props.value, $.get(selected)], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var div = root();
	let classes;
	var node = $.child(div);

	$.add_svelte_meta(() => $.snippet(node, () => $$props.children), 'render', Item, 13, 20);
	$.reset(div);
	$.template_effect(() => classes = $.set_class(div, 1, '', null, classes, { selected: $.get(selected) }));
	$.append($$anchor, div);

	return $.pop($$exports);
}