import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<!> <button>click me</button> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let current_path = $.prop($$props, 'current_path', 12, 'foo');
	let calls = $.prop($$props, 'calls', 12);
	let i = $.mutable_source(0);

	function getComponent(path) {
		calls().push(path);

		return null;
	}

	function onClick() {
		$.set(i, $.get(i) + 1);
	}

	var $$exports = {
		get current_path() {
			return current_path();
		},

		set current_path($$value) {
			current_path($$value);
			$.flush();
		},

		get calls() {
			return calls();
		},

		set calls($$value) {
			calls($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.component(node, () => getComponent(current_path()), ($$anchor, $$component) => {
		$$component($$anchor, {});
	});

	var button = $.sibling(node, 2);
	var text = $.sibling(button);

	$.template_effect(() => $.set_text(text, ` ${$.get(i) ?? ''}`));
	$.event('click', button, onClick);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}