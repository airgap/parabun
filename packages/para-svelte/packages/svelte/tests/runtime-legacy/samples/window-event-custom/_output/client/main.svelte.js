import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let escaped = $.prop($$props, 'escaped', 12, false);

	function esc(node, callback) {
		function onKeyDown(event) {
			if (event.key === 'Escape') callback(event);
		}

		node.addEventListener('keydown', onKeyDown);

		return {
			destroy() {
				node.removeEventListener('keydown', onKeyDown);
			}
		};
	}

	var $$exports = {
		get escaped() {
			return escaped();
		},

		set escaped($$value) {
			escaped($$value);
			$.flush();
		}
	};

	var p = root();

	$.action($.window, ($$node, $$action_arg) => esc?.($$node, $$action_arg), () => () => escaped(true));

	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `escaped: ${escaped() ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}