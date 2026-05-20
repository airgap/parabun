import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from "./sub.svelte";

var root = $.from_html(`<button> </button> <!>`, 1);

export default function Main($$anchor) {
	let state = $.mutable_source('foo');
	let param = $.mutable_source('');

	function action(node, _param) {
		$.set(param, _param);

		return {
			update(_param) {
				$.set(param, _param);
			}
		};
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button);

	$.reset(button);

	var node_1 = $.sibling(button, 2);

	Component(node_1, {
		action,
		get state() {
			return $.get(state);
		}
	});

	$.template_effect(() => $.set_text(text, `${$.get(state) ?? ''} / ${$.get(param) ?? ''}`));
	$.event('click', button, () => $.set(state, 'bar'));
	$.append($$anchor, fragment);
}