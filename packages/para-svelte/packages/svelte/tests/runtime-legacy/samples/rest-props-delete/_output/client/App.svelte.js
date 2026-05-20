import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>delete a</button> `, 1);

export default function App($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	const $$restProps = $.legacy_rest_props($$sanitized_props, []);

	$.push($$props, false);

	function prune() {
		$$restProps.a;
		delete $$restProps.a;

		// should be idempotent
		delete $$restProps.a;
	}

	$.init();

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.sibling(button);

	$.template_effect(($0) => $.set_text(text, ` ${$0 ?? ''}`), [
		() => (
			$.deep_read_state($$restProps),
			$.untrack(() => JSON.stringify($$restProps))
		)
	]);

	$.event('click', button, prune);
	$.append($$anchor, fragment);
	$.pop();
}