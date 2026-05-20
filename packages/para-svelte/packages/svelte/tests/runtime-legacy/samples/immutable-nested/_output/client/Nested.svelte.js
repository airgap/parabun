import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { beforeUpdate, onMount } from 'svelte';

var root = $.from_html(`<h3> </h3> <p> </p>`, 1);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let mounted = $.mutable_source(false, true);
	let count = $.prop($$props, 'count', 13, 0);
	let foo = $.prop($$props, 'foo', 29, () => ({ bar: 'baz' }));

	onMount(() => {
		$.set(mounted, true);
	});

	beforeUpdate(() => {
		if ($.get(mounted)) count(count() + 1);
	});

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
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

	$.init(true);

	var fragment = root();
	var h3 = $.first_child(fragment);
	var text = $.child(h3);

	$.reset(h3);

	var p = $.sibling(h3, 2);
	var text_1 = $.child(p);

	$.reset(p);

	$.template_effect(() => {
		$.set_text(text, `Called ${count() ?? ''} times.`);
		$.set_text(text_1, `${($.deep_read_state(foo()), $.untrack(() => foo().bar)) ?? ''} ${$.get(mounted) ?? ''}`);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}