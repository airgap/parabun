import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div>test</div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let prop = $.state(void 0);
	let key = $.state($.proxy({}));

	function action() {
		$.set(prop, {}, true);

		$.user_pre_effect(() => {
			return () => {
				$.get(prop);
			};
		});
	}

	$.user_effect(() => $.set(key, {}, true));

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.key(node, () => $.get(key), ($$anchor) => {
		var div = root_1();

		$.action(div, ($$node) => action?.($$node));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);
	$.pop();
}