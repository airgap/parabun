import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from "./Component.svelte";

var root = $.from_html(` <br/> <!>`, 1);

export default function Main($$anchor) {
	let value = $.mutable_source("foo");

	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var node = $.sibling(text, 3);

	Component(node, {
		get value() {
			return $.get(value);
		},

		set value($$value) {
			$.set(value, $$value);
		},
		$$legacy: true
	});

	$.template_effect(() => $.set_text(text, `Parent component "${$.get(value) ?? ''}"`));
	$.append($$anchor, fragment);
}