import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { beforeUpdate } from 'svelte';

var root = $.from_html(`<span> </span>`);

export default function Item($$anchor, $$props) {
	$.push($$props, false);

	let item = $.prop($$props, 'item', 12);
	let foo = $.prop($$props, 'foo', 12, 'XX');

	beforeUpdate(() => {
		foo(item());
	});

	var $$exports = {
		get item() {
			return item();
		},

		set item($$value) {
			item($$value);
			$.flush();
		},

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