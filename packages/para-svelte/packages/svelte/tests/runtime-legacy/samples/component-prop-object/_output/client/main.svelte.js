import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Child from "./Child.svelte";

var root = $.from_html(`<!> <button>inc x</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.mutable_source();

	$.legacy_pre_effect(() => ($.get(x)), () => {
		if (!$.get(x)) $.set(x, { y: 0 });
	});

	$.legacy_pre_effect_reset();

	var fragment = root();
	var node = $.first_child(fragment);

	{
		let $0 = $.derived_safe_equal(() => $.get(x) ?? {});

		Child(node, {
			get x() {
				return $.get($0);
			}
		});
	}

	var text = $.sibling(node);
	var button = $.sibling(text);

	$.template_effect(() => $.set_text(text, ` parent: ${($.get(x), $.untrack(() => $.get(x).y)) ?? ''} `));
	$.event('click', button, () => $.mutate(x, $.get(x).y++));
	$.append($$anchor, fragment);
	$.pop();
}