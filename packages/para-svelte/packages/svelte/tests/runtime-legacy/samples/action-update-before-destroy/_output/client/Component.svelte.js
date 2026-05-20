import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { afterUpdate, onDestroy } from "svelte";

var root_1 = $.from_html(`<div> </div>`);
var root = $.from_html(`<button>Click Me</button> <!>`, 1);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	const $items = () => $.store_get(items(), '$items', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let id = $.prop($$props, 'id', 12);
	let items = $.prop($$props, 'items', 12);
	let item = $items()[id()];
	let selected = $.mutable_source(true);

	function onClick() {
		$.set(selected, !$.get(selected));
		items().set({});
	}

	onDestroy(() => {
		console.log("onDestroy");
	});

	afterUpdate(() => {
		console.log("afterUpdate");
	});

	var $$exports = {
		get id() {
			return id();
		},

		set id($$value) {
			id($$value);
			$.flush();
		},

		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var div = root_1();
			var text = $.child(div, true);

			$.reset(div);
			$.template_effect(() => $.set_text(text, ($.untrack(() => item.id))));
			$.append($$anchor, div);
		};

		$.if(node, ($$render) => {
			if ($.get(selected)) $$render(consequent);
		});
	}

	$.event('click', button, onClick);
	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}