import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<pre> </pre>`);

export default function Main($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);
	const $$restProps = $.legacy_rest_props($$sanitized_props, ['y']);

	$.push($$props, false);

	let x = $.prop($$props, 'y', 12);

	var $$exports = {
		get y() {
			return x();
		},

		set y($$value) {
			x($$value);
			$.flush();
		}
	};

	var pre = root();
	var text = $.child(pre, true);

	$.reset(pre);

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.deep_read_state($$restProps),
			$.untrack(() => JSON.stringify($$restProps))
		)
	]);

	$.append($$anchor, pre);

	return $.pop($$exports);
}