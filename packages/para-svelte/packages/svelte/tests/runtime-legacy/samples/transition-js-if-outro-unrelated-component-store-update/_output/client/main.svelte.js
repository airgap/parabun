import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from "svelte/store";
import Component from "./Component.svelte";

var root_1 = $.from_html(`<button id="1"></button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $condition = () => $.store_get(condition(), '$condition', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let condition = $.prop($$props, 'condition', 28, () => writable(true));

	var $$exports = {
		get condition() {
			return condition();
		},

		set condition($$value) {
			condition($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var button = $.first_child(fragment_1);
			var node_1 = $.sibling(button, 2);

			Component(node_1, {
				get condition() {
					return condition();
				}
			});

			$.event('click', button, () => $.store_set(condition(), false));
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if ($condition()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}