import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { beforeUpdate } from 'svelte';

var root = $.from_html(`<pre> </pre> <pre> </pre>`, 1);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);
	let c = $.prop($$props, 'c', 12);
	let changed = $.mutable_source({});
	let previous = {};

	beforeUpdate(() => {
		$.mutate(changed, $.get(changed).a = a() !== previous.a);
		$.mutate(changed, $.get(changed).b = b() !== previous.b);
		$.mutate(changed, $.get(changed).c = c() !== previous.c);
		previous.a = a();
		previous.b = b();
		previous.c = c();
	});

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
			$.flush();
		},

		get c() {
			return c();
		},

		set c($$value) {
			c($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var pre = $.first_child(fragment);
	var text = $.child(pre, true);

	$.reset(pre);

	var pre_1 = $.sibling(pre, 2);
	var text_1 = $.child(pre_1, true);

	$.reset(pre_1);

	$.template_effect(
		($0, $1) => {
			$.set_text(text, $0);
			$.set_text(text_1, $1);
		},
		[
			() => (
				$.deep_read_state(a()),
				$.deep_read_state(b()),
				$.deep_read_state(c()),
				$.untrack(() => JSON.stringify({ a: a(), b: b(), c: c() }))
			),

			() => (
				$.get(changed),
				$.untrack(() => JSON.stringify($.get(changed)))
			)
		]
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}