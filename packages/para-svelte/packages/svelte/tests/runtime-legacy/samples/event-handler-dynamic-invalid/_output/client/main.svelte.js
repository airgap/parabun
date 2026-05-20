import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>undef</button> <button>null</button> <button>invalid</button>`, 1);

export default function Main($$anchor) {
	let handlerUndef = $.mutable_source();
	let handlerNull = $.mutable_source();
	let handlerInvalid = $.mutable_source();

	$.set(handlerUndef, undefined);
	$.set(handlerNull, null);
	$.set(handlerInvalid, 42);

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);

	$.event('click', button, function (...$$args) {
		$.get(handlerUndef)?.apply(this, $$args);
	});

	$.event('click', button_1, function (...$$args) {
		$.get(handlerNull)?.apply(this, $$args);
	});

	$.event('click', button_2, function (...$$args) {
		$.get(handlerInvalid)?.apply(this, $$args);
	});

	$.append($$anchor, fragment);
}