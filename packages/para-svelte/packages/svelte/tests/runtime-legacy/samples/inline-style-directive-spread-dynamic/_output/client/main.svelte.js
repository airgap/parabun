import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p></p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let color = $.prop($$props, 'color', 12, 'blue');
	let obj = $.prop($$props, 'obj', 28, () => ({ id: 'my-id', style: 'width: 65px' }));

	var $$exports = {
		get color() {
			return color();
		},

		set color($$value) {
			color($$value);
			$.flush();
		},

		get obj() {
			return obj();
		},

		set obj($$value) {
			obj($$value);
			$.flush();
		}
	};

	var p = root();

	$.attribute_effect(p, () => ({ ...obj(), [$.STYLE]: { color: color() } }));
	$.append($$anchor, p);

	return $.pop($$exports);
}