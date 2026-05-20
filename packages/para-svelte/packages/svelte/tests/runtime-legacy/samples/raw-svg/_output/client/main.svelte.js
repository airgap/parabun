import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_svg(`<svg></svg>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let show = $.prop($$props, 'show', 12, false);

	var $$exports = {
		get show() {
			return show();
		},

		set show($$value) {
			show($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var svg = root_1();

			$.html(svg, () => '<circle cx="200" cy="500" r="200"></circle>', true);
			$.reset(svg);
			$.append($$anchor, svg);
		};

		$.if(node, ($$render) => {
			if (show()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}