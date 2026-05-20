import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { get } from './get.js';

var root = $.from_html(`<span> </span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 28, get);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	$.init();

	var span = root();
	var text = $.child(span, true);

	$.reset(span);
	$.template_effect(() => $.set_text(text, foo()));
	$.append($$anchor, span);

	return $.pop($$exports);
}