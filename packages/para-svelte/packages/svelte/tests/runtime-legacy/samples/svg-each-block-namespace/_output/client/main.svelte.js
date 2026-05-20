import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_svg(`<circle cy="100" r="100"></circle>`);
var root = $.from_svg(`<svg></svg>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let colours = $.prop($$props, 'colours', 28, () => ['red', 'green', 'blue']);

	var $$exports = {
		get colours() {
			return colours();
		},

		set colours($$value) {
			colours($$value);
			$.flush();
		}
	};

	var svg = root();

	$.each(svg, 5, colours, $.index, ($$anchor, colour, i) => {
		var circle = root_1();

		$.set_attribute(circle, 'cx', i * 100);
		$.template_effect(() => $.set_attribute(circle, 'fill', $.get(colour)));
		$.append($$anchor, circle);
	});

	$.reset(svg);
	$.append($$anchor, svg);

	return $.pop($$exports);
}