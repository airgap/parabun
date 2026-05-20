import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>Click</button>`);

export default function Main($$anchor) {
	let makeHandler = $.mutable_source(null);

	$.set(makeHandler, () => {
		console.log('create');

		return () => console.log('trigger');
	});

	var button = root();
	var event_handler = $.derived(() => $.get(makeHandler)());

	$.event('click', button, function (...$$args) {
		$.get(event_handler)?.apply(this, $$args);
	});

	$.append($$anchor, button);
}