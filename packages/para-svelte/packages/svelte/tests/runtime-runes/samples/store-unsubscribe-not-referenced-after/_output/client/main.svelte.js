import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { writable, derived } from "svelte/store";

var root_1 = $.from_html(` <button>remove watcher</button>`, 1);
var root_2 = $.from_html(`<button>add watcher</button>`);
var root = $.from_html(`<input type="number"/> <p> </p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const $obj = () => $.store_get(obj, '$obj', $$stores);
	const $watcherA = () => $.store_get($.get(watcherA), '$watcherA', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const obj = writable({ a: 1 });
	let count = $.state(0);
	let watcherA = $.state(void 0);

	function watch(prop) {
		return derived(obj, (o) => {
			$.update(count);

			return o[prop];
		});
	}

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var p = $.sibling(input, 2);
	var text = $.child(p, true);

	$.reset(p);

	var node = $.sibling(p, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var text_1 = $.first_child(fragment_1);
			var button = $.sibling(text_1);

			$.template_effect(() => $.set_text(text_1, `${$watcherA() ?? ''} `));
			$.event('click', button, () => $.store_unsub($.set(watcherA, null), '$watcherA', $$stores));
			$.append($$anchor, fragment_1);
		};

		var alternate = ($$anchor) => {
			var button_1 = root_2();

			$.event('click', button_1, () => $.store_unsub($.set(watcherA, watch("a"), true), '$watcherA', $$stores));
			$.append($$anchor, button_1);
		};

		$.if(node, ($$render) => {
			if ($.get(watcherA)) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.template_effect(() => $.set_text(text, $.get(count)));
	$.bind_value(input, () => $obj().a, ($$value) => $.store_mutate(obj, $.untrack($obj).a = $$value, $.untrack($obj)));
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}