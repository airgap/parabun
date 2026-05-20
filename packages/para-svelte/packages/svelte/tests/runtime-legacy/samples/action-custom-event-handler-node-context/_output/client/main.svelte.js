import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let z = $.prop($$props, 'z', 12, 10);

	function tap(node, callback) {
		const clickHandler = (event) => {
			callback(event);
		};

		node.addEventListener('click', clickHandler, false);

		return {
			destroy() {
				node.addEventListener('click', clickHandler, false);
			}
		};
	}

	var $$exports = {
		get z() {
			return z();
		},

		set z($$value) {
			z($$value);
			$.flush();
		}
	};

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.action(button, ($$node, $$action_arg) => tap?.($$node, $$action_arg), () => () => z(z() + 1));
	$.template_effect(() => $.set_text(text, z()));
	$.append($$anchor, button);

	return $.pop($$exports);
}