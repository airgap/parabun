import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, 0);
	let y = $.prop($$props, 'y', 12, 0);

	function tap(node, callback) {
		function clickHandler(event) {
			callback({ x: event.clientX, y: event.clientY });
		}

		node.addEventListener('click', clickHandler, false);

		return {
			destroy() {
				node.addEventListener('click', clickHandler, false);
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
		},

		get y() {
			return y();
		},

		set y($$value) {
			y($$value);
			$.flush();
		}
	};

	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.action(button, ($$node, $$action_arg) => tap?.($$node, $$action_arg), () => (event) => (x(event.x), y(event.y)));
	$.template_effect(() => $.set_text(text, `${x() ?? ''}, ${y() ?? ''}`));
	$.append($$anchor, button);

	return $.pop($$exports);
}