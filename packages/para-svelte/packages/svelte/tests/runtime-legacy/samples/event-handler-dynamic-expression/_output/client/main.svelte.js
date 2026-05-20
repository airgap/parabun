import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor) {
	let name = $.mutable_source('bar');

	function foo() {
		$.set(name, 'foo');
	}

	function bar() {
		$.set(name, 'bar');
	}

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, $.get(name)));

	$.event('click', button, function (...$$args) {
		($.get(name) === 'bar' ? foo : bar)?.apply(this, $$args);
	});

	$.append($$anchor, button);
}