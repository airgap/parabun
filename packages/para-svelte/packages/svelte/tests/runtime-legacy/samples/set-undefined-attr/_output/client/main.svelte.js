import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root = $.from_html(`<div draggable="false"></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, 1);
	let bar = $.prop($$props, 'bar', 12);
	let _class = $.prop($$props, '_class', 12);

	onMount(() => {
		foo(undefined);
	});

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		},

		get _class() {
			return _class();
		},

		set _class($$value) {
			_class($$value);
			$.flush();
		}
	};

	$.init();

	var div = root();

	$.template_effect(() => {
		$.set_attribute(div, 'foo', foo());
		$.set_attribute(div, 'bar', bar());
		$.set_class(div, 1, $.clsx(_class()));
	});

	$.append($$anchor, div);

	return $.pop($$exports);
}