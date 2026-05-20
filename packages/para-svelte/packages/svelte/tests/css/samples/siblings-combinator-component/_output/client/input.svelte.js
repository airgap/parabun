import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<v class="svelte-xyz"></v>`);
var root_2 = $.from_html(`<y class="svelte-xyz"></y>`);
var root_3 = $.from_html(`<span><n></n></span>`);
var root_4 = $.from_html(`<span><n></n></span>`);
var root = $.from_html(`<div><x class="svelte-xyz"></x> <!> <z class="svelte-xyz"></z> <!> <m></m></div>`);

export default function Input($$anchor) {
	var div = root();
	var node = $.sibling($.child(div), 2);

	{
		const foo = ($$anchor) => {
			var v = root_1();

			$.append($$anchor, v);
		};

		Child(node, {
			foo,
			children: ($$anchor, $$slotProps) => {
				var y = root_2();

				$.append($$anchor, y);
			},
			$$slots: { foo: true, default: true }
		});
	}

	var node_1 = $.sibling(node, 4);

	{
		const foo = ($$anchor) => {
			var span = root_3();

			$.append($$anchor, span);
		};

		Child(node_1, {
			foo,
			children: ($$anchor, $$slotProps) => {
				var span_1 = root_4();

				$.append($$anchor, span_1);
			},
			$$slots: { foo: true, default: true }
		});
	}

	$.next(2);
	$.reset(div);
	$.append($$anchor, div);
}