import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root = $.from_html(`<button>Click Me</button> <!>`, 1);

export default function Main($$anchor) {
	let nested = $.mutable_source();
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.bind_this(Nested(node, { $$legacy: true }), ($$value) => $.set(nested, $$value), () => $.get(nested));

	$.event('click', button, function (...$$args) {
		($.get(nested) && $.get(nested).updateText)?.apply(this, $$args);
	});

	$.append($$anchor, fragment);
}