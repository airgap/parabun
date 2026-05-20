import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from "./Component.svelte";

export default function Main($$anchor) {
	let condition = $.mutable_source(true);
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Component($$anchor, {
				get condition() {
					return $.get(condition);
				},

				set condition($$value) {
					$.set(condition, $$value);
				},
				$$legacy: true
			});
		};

		$.if(node, ($$render) => {
			if ($.get(condition)) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
}