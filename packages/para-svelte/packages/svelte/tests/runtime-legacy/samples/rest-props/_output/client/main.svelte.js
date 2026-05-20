import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import App from './App.svelte';

var root = $.from_html(`<!> <button></button> <button></button> <button></button> <button></button>`, 1);

export default function Main($$anchor) {
	let a = $.mutable_source(1);
	let b = $.mutable_source(2);
	let c = 3;
	let d = $.mutable_source(4);
	let e = 5;
	let f = $.mutable_source({ foo: 1 });

	function updateProps() {
		$.set(a, 31);
		$.set(b, 32);
	}

	function updateRest() {
		$.set(d, 34);
	}

	function updateSpread() {
		$.mutate(f, $.get(f).foo = 31);
	}

	function updateSpread2() {
		$.mutate(f, $.get(f).bar = 2);
	}

	var fragment = root();
	var node = $.first_child(fragment);

	App(node, $.spread_props(
		{
			get a() {
				return $.get(a);
			},

			get b() {
				return $.get(b);
			},
			c,
			get d() {
				return $.get(d);
			},
			e
		},
		() => $.get(f)
	));

	var button = $.sibling(node, 2);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);

	$.event('click', button, updateProps);
	$.event('click', button_1, updateRest);
	$.event('click', button_2, updateSpread);
	$.event('click', button_3, updateSpread2);
	$.append($$anchor, fragment);
}