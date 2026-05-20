import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	var div = root();
	var node = $.child(div);

	Widget(node, $.spread_props(() => $$sanitized_props, { qux: 'named' }));
	$.reset(div);
	$.append($$anchor, div);
}