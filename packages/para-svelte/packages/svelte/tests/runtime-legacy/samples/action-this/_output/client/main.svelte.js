import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, 0);

	function foo(node) {
		const handler = () => {
			x(x() + 1);
		};

		node.addEventListener('click', handler);
		handler();

		return {
			destroy() {
				node.removeEventListener('click', handler);
			}
		};
	}

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.action(button, ($$node) => foo?.($$node));
	$.template_effect(() => $.set_text(text, x()));
	$.append($$anchor, button);

	return $.pop($$exports);
}