import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input/>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let input = $.prop($$props, 'input', 12);
	let blurred = $.prop($$props, 'blurred', 12, false);
	let visible = $.prop($$props, 'visible', 12, true);

	var $$exports = {
		get input() {
			return input();
		},

		set input($$value) {
			input($$value);
			$.flush();
		},

		get blurred() {
			return blurred();
		},

		set blurred($$value) {
			blurred($$value);
			$.flush();
		},

		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var input_1 = root_1();

			$.bind_this(input_1, ($$value) => input($$value), () => input());
			$.event('blur', input_1, () => blurred(true));
			$.append($$anchor, input_1);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}