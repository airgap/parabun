import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);

	let Math = $.prop($$props, 'Math', 28, () => ({
		min(a, b) {
			return 'potato';
		}
	}));

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get Math() {
			return Math();
		},

		set Math($$value) {
			Math($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.deep_read_state(Math()),
			$.deep_read_state(x()),
			$.untrack(() => Math().min(x(), 5))
		)
	]);

	$.append($$anchor, text);

	return $.pop($$exports);
}